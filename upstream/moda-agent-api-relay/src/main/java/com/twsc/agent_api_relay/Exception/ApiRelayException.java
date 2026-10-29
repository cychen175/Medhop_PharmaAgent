package com.twsc.agent_api_relay.Exception;

import org.springframework.http.HttpStatus;


public class ApiRelayException extends RuntimeException {

    private HttpStatus respHttpStatus;

    private String message;

    public ApiRelayException(HttpStatus respHttpStatus, String message) {
        super(message);
        this.respHttpStatus = respHttpStatus;
        this.message = message;
    }


    public HttpStatus getRespHttpStatus() {
        return respHttpStatus;
    }


    public String getMessage() {
        return message;
    }

}
