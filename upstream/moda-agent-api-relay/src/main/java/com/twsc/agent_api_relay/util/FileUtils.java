package com.twsc.agent_api_relay.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Slf4j
@Component
public class FileUtils {

    public Path getLocalStoragePath(String localDirStr, String fileName) {
        if (localDirStr == null || localDirStr.trim().isEmpty()) {
            throw new IllegalArgumentException("基礎目錄路徑不能為空");
        }
        if (fileName == null || fileName.trim().isEmpty()) {
            throw new IllegalArgumentException("模型名稱不能為空");
        }
        String modelDir = localDirStr + "/" + fileName;

        return Path.of(modelDir);
    }

    public void downloadAndReplace(MultipartFile file, Path localPath) throws IOException {
        Path tempPath = Files.createTempFile("upload_", ".tmp");
        log.info(file.getOriginalFilename());
        try (InputStream uploadStream = file.getInputStream()) {
            Files.copy(uploadStream, tempPath, StandardCopyOption.REPLACE_EXISTING);
        }
        if (Files.exists(localPath) && !Files.isWritable(localPath)) {
            throw new IOException("目標文件不可寫: " + localPath);
        }
        Files.move(tempPath, localPath, StandardCopyOption.REPLACE_EXISTING);
    }
}
