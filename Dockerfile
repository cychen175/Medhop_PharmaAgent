FROM ubuntu:22.04 AS build
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends build-essential ca-certificates curl xz-utils libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev libffi-dev liblzma-dev libgdbm-dev uuid-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /build
# Official source and checksum: https://www.python.org/downloads/release/python-3147/
RUN curl -fSL https://www.python.org/ftp/python/3.14.7/Python-3.14.7.tar.xz -o main.tar.xz && echo '3b48dac8fb59f62eaa67ac83c1eb12bda1b7a08406dd286e252c11a66be27f81  main.tar.xz' | sha256sum -c - && tar -xf main.tar.xz && cd Python-3.14.7 && ./configure --prefix=/opt/python314 --with-ensurepip=install && make -j2 && make install
# Isolated compatibility worker, not the API runtime.
RUN curl -fSL https://www.python.org/ftp/python/3.11.14/Python-3.11.14.tar.xz -o worker.tar.xz && echo '2f7d50f6e41d61607022dfeb7741df3a  worker.tar.xz' | md5sum -c - && tar -xf worker.tar.xz && cd Python-3.11.14 && ./configure --prefix=/opt/python311 --with-ensurepip=install && make -j2 && make install
COPY requirements.lock requirements-worker.txt /build/
RUN /opt/python314/bin/python3.14 -m pip install --no-cache-dir -r requirements.lock && /opt/python311/bin/python3.11 -m pip install --no-cache-dir -r requirements-worker.txt

FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONUTF8=1 PYTHONDONTWRITEBYTECODE=1 MEDHOP_PYTHON=/opt/python311/bin/python3.11 MODEL_URL=http://host.docker.internal:13305/api/v1
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl3 zlib1g libbz2-1.0 libreadline8 libsqlite3-0 libffi8 liblzma5 libgdbm6 libuuid1 libgomp1 && rm -rf /var/lib/apt/lists/* && useradd --create-home --uid 10001 pharmacy
COPY --from=build /opt/python314 /opt/python314
COPY --from=build /opt/python311 /opt/python311
WORKDIR /app
COPY --chown=pharmacy:pharmacy . /app
RUN mkdir -p /app/runtime && chown pharmacy:pharmacy /app/runtime
USER pharmacy
EXPOSE 8502
CMD ["/opt/python314/bin/python3.14", "-m", "uvicorn", "asgi:app", "--host", "0.0.0.0", "--port", "8502", "--no-access-log"]
