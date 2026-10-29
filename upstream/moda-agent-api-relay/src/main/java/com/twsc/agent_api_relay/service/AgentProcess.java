package com.twsc.agent_api_relay.service; // 建議放到 service 套件下

import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;

@Slf4j
public record AgentProcess(Process process, BufferedWriter writer, BufferedReader reader) implements AutoCloseable {

    public void close() {
        try {
            if (writer != null){
                log.info("WRITER : close");
                writer.close();
            }
            if (reader != null) {
                log.info("READER : close");
                reader.close();
            }
            if (process != null) process.destroy();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public boolean equals(Object obj) {
        return false;
    }

    @Override
    public int hashCode() {
        return 0;
    }

    @Override
    public String toString() {
        return "";
    }
}