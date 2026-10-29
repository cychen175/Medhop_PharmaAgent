package com.twsc.agent_api_relay.infra.state;

import com.twsc.agent_api_relay.infra.model.ModelState;
import org.springframework.stereotype.Component;

@Component
public class ModelStateHolder {

    private ModelState modelState;

    public ModelState getModelState() {
        return modelState;
    }

    public void setModelState(ModelState modelState) {
        this.modelState = modelState;
    }
}
