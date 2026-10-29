# --- 階段一：建置 Java 應用 (Build Stage) ---
# 使用一個包含完整 JDK 的 Image 作為建置環境
FROM eclipse-temurin:17-jdk AS build-java
WORKDIR /work
# 複製 Gradle wrapper 與設定（包含離線 ZIP）
COPY ./moda-agent-api-relay/gradlew ./
COPY ./moda-agent-api-relay/build.gradle ./
COPY ./moda-agent-api-relay/settings.gradle ./
COPY ./moda-agent-api-relay/gradle ./gradle
# 複製原始碼
COPY ./moda-agent-api-relay/src ./src

RUN chmod +x ./gradlew
# 使用 offline build（因為 ZIP 已經在本地）
RUN ./gradlew build --no-daemon
# --- 最終階段：組合執行環境 (Runtime Stage) ---
FROM eclipse-temurin:17-jdk-jammy
# 安裝所有必要的系統工具
RUN apt-get update && apt-get install -y \
    wget bzip2 build-essential git \
    tesseract-ocr tesseract-ocr-chi-tra \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# --- 安裝 Miniconda ---
ENV CONDA_DIR=/opt/conda
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then \
        echo "Downloading Miniconda for ARM64..."; \
        wget --quiet https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-aarch64.sh -O ~/miniconda.sh; \
    else \
        echo "Downloading Miniconda for x86_64..."; \
        wget --quiet https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda.sh; \
    fi && \
    /bin/bash ~/miniconda.sh -b -p $CONDA_DIR && \
    rm ~/miniconda.sh

ENV PATH=$CONDA_DIR/bin:$PATH

# 複製 Conda 環境設定檔並建立環境
WORKDIR /app
COPY ./moda-agent/environment.yml ./environment.yml
COPY ./moda-agent/poc_easyocr/ocr_env.yml ./ocr_env.yml

# 【修正 1】：整合環境建立與 NumPy 修復，確保這是一個連續的 RUN 指令
RUN conda config --set always_yes yes && \
    conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main && \
    conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r && \
    conda env create -f ./environment.yml && \
    conda run -n moda_agent_env pip install "numpy<2.0.0"

# 【修正 2】：建立 OCR 環境 (確保與上面的 RUN 指令分開，或是加上正確的連接符號)
RUN conda env create -f ./ocr_env.yml
# 在 OCR 環境安裝純 CPU 版 Torch (針對 aarch64)
RUN conda run -n ocr_env pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 從 build-java 階段複製編譯好的 .jar 檔
COPY --from=build-java /work/build/libs/*.jar ./app.jar

# 複製 Python 專案的程式碼及啟動腳本
COPY ./moda-agent /app/moda_agent
COPY moda-agent-api-relay/entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 8080 5000
ENTRYPOINT ["./entrypoint.sh"]
