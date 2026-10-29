package com.twsc.agent_api_relay.util;


import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

@Slf4j
public class SseOutputWriter {
    private final OutputStream outputStream;

    public SseOutputWriter(OutputStream outputStream) {
        this.outputStream = outputStream;
    }

    public void writeData(Object data) throws IOException {
        try {
            outputStream.write(SseMessageUtil.wrapData(data).getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
        } catch (IOException e) {
            log.error("writeData 寫入 SSE 資料失敗 : {}", e.getMessage());
            throw new UncheckedIOException("寫入 SSE 資料失敗", e);
        }
    }
    // 一個輔助方法，用於在出錯時也能發送標準的 SSE 事件
    public void writeSseEvent(String event) throws IOException {
        outputStream.write(("event: " + event + "\n").getBytes(StandardCharsets.UTF_8));
    }

    public void writeError(String errorMsg) {
        try {
            outputStream.write(SseMessageUtil.wrapError(errorMsg).getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
        } catch (IOException e) {
            log.error("writeError 寫入 SSE 資料失敗 : {}", e.getMessage());
            throw new UncheckedIOException("寫入 SSE 錯誤訊息失敗", e);
        }
    }

    public void writeDone() {
        try {
            outputStream.write(SseMessageUtil.wrapDone().getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
        } catch (IOException e) {
            log.error("writeDone 寫入 SSE 資料失敗 : {}", e.getMessage());
            throw new UncheckedIOException("寫入 SSE 結束訊息失敗", e);
        }
    }
}
