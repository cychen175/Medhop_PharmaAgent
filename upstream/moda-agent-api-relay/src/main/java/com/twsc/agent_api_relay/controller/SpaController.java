package com.twsc.agent_api_relay.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {
    @RequestMapping(value = "/{path:[^\\.]*}")
    public String redirect() {
        // 將所有非檔案請求（不含點的路徑）導向 index.html
        return "forward:/index.html";
    }
}
