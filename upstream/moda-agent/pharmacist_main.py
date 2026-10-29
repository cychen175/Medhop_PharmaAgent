import asyncio
from agent import Agent
from tool.conversation import AgentConversation
from tool.database import RAGDatabase
from utils.prompts import AgentSystemPrompt
from utils.llm_client import LLMClient
import sys
import argparse


async def main(args):
    # 初始化藥物仿單資料庫
    drug_memory = RAGDatabase(
        collection_name="drug_memory",
        persistence_path="./tmp/chroma_db/drug_db",
        k=3,
        score_threshold=0.5,
        data_glob="data/drug_info/*.pdf",
    )
    await drug_memory.build_chroma()

    # LLM 客戶端設定
    model_client = LLMClient(
        model=args.model,
        api_key=args.api_key,
        base_url=args.base_url
    )

    print("=== 🤖 藥師藥事 - 藥師/藥局 🤖 ===")
    print("⚠️ 提醒：以下建議僅供參考，請依照藥師判斷為主。")

    system_prompt = AgentSystemPrompt(role="pharmacist").get_prompt()
    agent = Agent(model_client=model_client).build_agent(system_prompt, [drug_memory])
    messages = []

    def read_multiline_input(prompt: str) -> str:
        print(prompt)
        lines = []
        while True:
            try:
                line = input()
            except EOFError:
                break
            if line == "EOF":
                break
            lines.append(line)
        return "\n".join(lines)

    try:
        user_input = sys.stdin.read()
        messages.append({"role": "user", "content": user_input})
        print("message:", messages)
        print("正在分析，請稍候...\n")

        print("🩺 藥師建議：\n", end="")
        # 🔥 修改：以串流方式逐段輸出
        buffer = []
        start_sent = False

        def _on_chunk(chunk: str):
            nonlocal start_sent
            if not start_sent:
                print("[START]", flush=True)
                start_sent = True
            buffer.append(chunk)
            print(f"DATA:{chunk}", flush=True)

        # 🔥 修改：原生 callback 串流
        await AgentConversation(agent).chat_stream_native(user_input, _on_chunk)
        response = "".join(buffer)
        messages.append({"role": "pharmacist", "content": response})

    except KeyboardInterrupt:
        print("\n👋 程式中斷，歡迎再次使用。")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="醫生藥事 AI 助理")
    parser.add_argument("--model", type=str, default="gpt-4o", help="要使用的模型名稱")
    parser.add_argument("--api-key", type=str, required=True, help="您的 API Key")  # required=True 讓它成為必填參數
    parser.add_argument("--base-url", type=str, default="https://api.openai.com/v1", help="API 的 Base URL")

    # 解析命令列傳入的參數
    args = parser.parse_args()
    asyncio.run(main(args))
