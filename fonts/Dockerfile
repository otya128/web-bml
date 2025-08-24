# 古いバージョンじゃないと「始 (U+59CB)」や「螢 (U+87A2)」がおかしくなる
FROM debian:bullseye AS builder

COPY bold.py /
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get install --no-install-recommends -y \
      python3 \
      python3-fontforge \
      ca-certificates \
      curl && \
    curl -L https://raw.githubusercontent.com/googlefonts/kosugi-maru/bd22c671a9ffc10cc4313e6f2fd75f2b86d6b14b/fonts/webfonts/KosugiMaru-Regular.woff2 -o KosugiMaru-Regular.woff2 && \
    curl -L https://raw.githubusercontent.com/googlefonts/kosugi/75171a2738135ab888549e76a9037e826094f0ce/fonts/webfonts/Kosugi-Regular.woff2 -o Kosugi-Regular.woff2 && \
    SOURCE_DATE_EPOCH=0 python3 /bold.py && \
    apt-get purge -y python3 python3-fontforge ca-certificates curl && \
    apt-get autoremove -y

FROM scratch

COPY --from=builder /*.ttf /*.woff2 .
