package com.twsc.agent_api_relay.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.function.Function;

@Component
@Slf4j
public class RestUtil {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper(); // 用於 JSON 轉換

    /**
     * 通用的 Post Multipart 檔案方法
     *
     * @param url  目標 URL
     * @param file 檔案
     * @param <T>  回傳的型態
     */
    public <T, R> R postFile(String url, MultipartFile file, Class<T> responseClass, Function<T, R> responseHandler) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", file.getResource());

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // 先取得 String 原始內容
            ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                // 將 JSON 字串轉成指定的 Java 物件
                T mappedObject = objectMapper.readValue(response.getBody(), responseClass);
                // 執行 Lambda
                return responseHandler.apply(mappedObject);
            }
            throw new RuntimeException("API 失敗: " + response.getStatusCode());
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new RuntimeException("REST 呼叫發生錯誤", e);
        }
    }
}
