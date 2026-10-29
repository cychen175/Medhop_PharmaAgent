package com.twsc.agent_api_relay.service;

import com.twsc.agent_api_relay.config.AgentConfig;
import com.twsc.agent_api_relay.config.WebConfig;
import com.twsc.agent_api_relay.dto.OcrResponse;
import com.twsc.agent_api_relay.dto.PrescriptionOCRRespDTO;
import com.twsc.agent_api_relay.util.RestUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.twsc.agent_api_relay.util.FileUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentIngestionService {
    private final FileUtils fileUtils;

    private final RestUtil restUtil;

    @Autowired
    private final AgentConfig agentConfig;

    public void uploadDrugPdf(MultipartFile file) {
        String localPath = computeAbsolutePath("drug_info");
        checkPath(localPath);
        Path targetPath = fileUtils.getLocalStoragePath(localPath, file.getOriginalFilename());
        try {
            fileUtils.downloadAndReplace(file, targetPath);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public PrescriptionOCRRespDTO prescriptionOCR(MultipartFile file) {
        String targetUrl = agentConfig.getOcrURL();
        // 使用 Lambda 處理回傳的 JSON 字串
        return restUtil.postFile(targetUrl, file, OcrResponse.class, res -> {
            // 這裡可以直接使用 res 的屬性
            if (res != null && res.isSuccess()) {
                log.info(res.getVlmText());
                return PrescriptionOCRRespDTO.builder()
                        .success(res.isSuccess())
                        .text(res.getText())
                        .vlmText(res.getVlmText())
                        .build();
            } else {
                log.warn("OCR 失敗或回傳為空");
                return PrescriptionOCRRespDTO.builder()
                        .success(false)
                        .build();
            }
        });
    }

    private String computeAbsolutePath(String subDirName) {
        String os = System.getProperty("os.name").toLowerCase();
        if (os.contains("win") || os.contains("mac")) {
            // 在使用者文件目錄下建立一個基礎工作區路徑
            return Paths.get(System.getProperty("user.home"), "Documents", "workspace", "TWS", subDirName).toString();
        } else {
            // Linux 系統的處理方式
            return "/app/moda_agent/data/" + subDirName;
        }
    }

    private void checkPath(String path) {
        File dir = new File(path);
        if (!dir.exists()) {
            boolean created = dir.mkdirs();
            if (!created) {
                // 在實際應用中，如果目錄建立失敗，最好拋出一個錯誤
                throw new RuntimeException("無法建立目錄: " + path);
            }
        }
    }
}
