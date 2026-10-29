package com.twsc.agent_api_relay.controller;

import com.twsc.agent_api_relay.service.DocumentIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RestController
@RequestMapping("/v1/documents") // 使用獨立的路徑前綴
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentIngestionService documentIngestionService;

    @PostMapping("/uploadPdf")
    public ResponseEntity<?> uploadDrugPdf(@RequestParam("file") MultipartFile file) {
        log.info("Upload API : /v1/documents/upload - filename: {}", file.getOriginalFilename());
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        documentIngestionService.uploadDrugPdf(file);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/ocr")
    public ResponseEntity<?> prescriptionOCR(@RequestParam("file") MultipartFile file) {
        log.info("OCR API : /v1/documents/ocr - filename: {}", file.getOriginalFilename());
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(documentIngestionService.prescriptionOCR(file));
    }
}
