package com.twsc.agent_api_relay.service;

import com.twsc.agent_api_relay.config.WebConfig;
import com.twsc.agent_api_relay.dto.AddConversationReqDTO;
import com.twsc.agent_api_relay.dto.ChatReqDTO;
import com.twsc.agent_api_relay.dto.ConversationHistoriesRespDTO;
import com.twsc.agent_api_relay.infra.model.ModelState;
import com.twsc.agent_api_relay.infra.state.ModelStateHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.*;

import com.twsc.agent_api_relay.constant.AgentType;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import com.twsc.agent_api_relay.util.SseOutputWriter;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AgentProcessManager {

    private ModelStateHolder modelStateHolder;

    @Autowired
    private ConversationService conversationService;

    private WebConfig webConfig;

    @Autowired
    public AgentProcessManager(ModelStateHolder modelStateHolder, WebConfig webConfig) {
        log.info("Initializing PythonProcessManager...");
        this.modelStateHolder = modelStateHolder;
        this.webConfig = webConfig;
    }

    private AgentProcess getProcess(String agentType) {
        String scriptName = AgentType.DOCTOR.getTypeName().equalsIgnoreCase(agentType) ? AgentType.DOCTOR.getScriptName() : AgentType.PHARMACIST.getScriptName();
        ModelState modelState = modelStateHolder.getModelState();
        log.info("Used Model:{}", modelState);
        try {
            if (modelState != null) {
                // 在 Docker 容器內的 Python 路徑
                String pythonExecutablePath = "/opt/conda/envs/moda_agent_env/bin/python";
                // Python 專案的工作目錄
                String workDir = "/app/moda_agent";

                ProcessBuilder pb = new ProcessBuilder(
                        pythonExecutablePath,
                        "-u",
                        scriptName,
                        "--host", webConfig.getHost(),
                        "--port", webConfig.getPort(),
                        "--model", modelState.getModel(),
                        "--api-key", modelState.getApiKey(),
                        "--base-url", modelState.getBaseUrl()
                );
                pb.directory(new File(workDir));
                pb.redirectErrorStream(true); // 將錯誤流合併到標準輸出流，方便統一讀取

                log.info("Executing command for agent '{}': {}", agentType, String.join(" ", pb.command()));
                Process process = pb.start();

                // 明確使用 UTF-8 編碼，避免中文字元亂碼
                BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8));
                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));

                // 直接返回新建立的程序物件，不再進行任何等待
                return new AgentProcess(process, writer, reader);
            }
            return null;
        } catch (IOException e) {
            log.error("Failed to start new Python process for agent '{}'", agentType, e);
            return null;
        }
    }

    public StreamingResponseBody chatWithAgent(ChatReqDTO request) throws InterruptedException {
        String userInput = request.getUserInput();
        String agent = request.getAgent();
        String userName = request.getUserName();

        String conversationId = conversationService.addConversation(AddConversationReqDTO.builder()
                .agent(agent)
                .question(userInput)
                .userName(userName).build());
        return outputStream -> {
            SseOutputWriter sseWriter = new SseOutputWriter(outputStream);
            try (AgentProcess agentProcess = getProcess(agent)) {
                log.debug("Agent : {} , user question : {}", agent, userInput);

                BufferedWriter writer = agentProcess.writer();
                BufferedReader reader = agentProcess.reader();

                // 1. 寫入使用者輸入並關閉寫入流，以觸發 Python 的 sys.stdin.read()
                writer.write(userInput);
                writer.flush();
                writer.close();

                boolean capture = false;
                boolean ciTag = false;
                String line;
                final String DATA_PREFIX = "DATA:";
                final String Citation = "[Citation]";
                StringBuilder responseContent = new StringBuilder();
                while ((line = reader.readLine()) != null) {
                    if (line.contains("Connection error")) {
                        log.error("Error response : {}", line);
                        throw new RuntimeException("Connection error");
                    }
                    if (line.contains("[START]")) {
                        capture = true;
                        sseWriter.writeData(Map.of("conversationId", conversationId));
                        log.info("Conversation id : {} ", conversationId);
                    }
                    String drugInfoPath = Paths.get(webConfig.getDrugPath()).toUri().toString();
//                    log.info("Static path : {}", drugInfoPath);
                    if (capture) {
                        if (line.startsWith(DATA_PREFIX)) {
                            // 移除前綴，只取真正的資料
                            String sseData = line.substring(DATA_PREFIX.length());
                            log.debug("SseData : {} ", sseData);
                            sseWriter.writeData(Map.of("content", sseData));
                            responseContent.append(sseData);
                        } else if (line.isEmpty()) {
                            // *** 這就是您需要的修正 ***
                            // 偵測到一個沒有 "DATA:" 前綴的空行
                            // 我們合理假設這是一個 LLM 產生的換行符
                            sseWriter.writeData(Map.of("content", "\n"));
                            responseContent.append("\n");
                        } else {
                            log.warn("Ignored non-DATA line from agent: {}", line);
                        }
                        if (line.startsWith(Citation) && !ciTag) {
                            ciTag = true;
                            sseWriter.writeData(Map.of("content", "\n"));
                            sseWriter.writeData(Map.of("content", "\n"));
                            sseWriter.writeData(Map.of("content", "---"));
                            sseWriter.writeData(Map.of("content", "\n"));
                            sseWriter.writeData(Map.of("content", "## 參考文獻"));
                            responseContent.append("\n");
                            responseContent.append("\n");
                            responseContent.append("---");
                            responseContent.append("\n");
                            responseContent.append("## 參考文獻");
                        }
                        if (line.startsWith(Citation)) {
                            sseWriter.writeData(Map.of("content", "\n"));
                            String citation = line.substring(Citation.length()).trim();

                            // 2. 找到最後一個分隔符號的位置 (不管是 / 還是 \)
                            String fileName = getString(citation);
                            responseContent.append("\n");
                            responseContent.append("[" + fileName + "]" + "(<http://" + webConfig.getHost() + ":" + webConfig.getPort() + "/docs/" + fileName + ">)");
                            log.info("Citation : {} , fileName : {}", citation, fileName);
                            sseWriter.writeData(Map.of("content", "[" + fileName + "]" + "(<http://" + webConfig.getHost() + ":" + webConfig.getPort() + "/docs/" + fileName + ">)"));
                        }
                    } else {
                        log.info("Agent response : {}", line);
                    }
                }
                conversationService.updateConversation(conversationId, responseContent.toString());
                log.debug("LLM response full content : {}", responseContent);
                int exitCode = agentProcess.process().waitFor();
                log.info("Python process for agent '{}' exited with code: {}", agent, exitCode);
                sseWriter.writeDone();
            } catch (IOException | InterruptedException e) {
                if (e instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                }
                sseWriter.writeError(e.getMessage());
            } catch (Exception e) {
                sseWriter.writeError(e.getMessage());
            }
        };
    }

    private String getString(String citation) {
        int lastSeparatorIndex = Math.max(citation.lastIndexOf('/'), citation.lastIndexOf('\\'));

        String fileName;
        if (lastSeparatorIndex >= 0) {
            // 取得分隔符號之後的文字
            fileName = citation.substring(lastSeparatorIndex + 1);
        } else {
            // 如果找不到分隔符號，代表整串就是檔名
            fileName = citation;
        }
        return fileName;
    }

    public List<ConversationHistoriesRespDTO> getConversationHistories(String userName) {
        return conversationService.getConversationHistories(userName);
    }

}