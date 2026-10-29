from autogen_agentchat.agents import AssistantAgent


class Agent:
    def __init__(self, model_client) -> None:
        self.model_client = model_client

    def build_agent(self, system_prompt: str, memory: list, **kwargs) -> AssistantAgent:
        agent = AssistantAgent(
            name="doctor",
            model_client=self.model_client,
            system_message=system_prompt,
            memory=memory,
            model_client_stream=True,  # 🔥 新增：啟用原生串流模式
            **kwargs,
        )

        return agent
