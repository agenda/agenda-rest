#!/usr/bin/env bash

# -- ENV -- #
#
# IMAGE_NAME=''
#
# each tag should correspond to the stage name
# AS in Dockerfile
# --target in docker build
# TAGS=(
#   ''
#   ''
# )
#
# [optional]
# BUILD_ARGS=(
#   value as another env var
#   VERSION=$VERSION
#   value defined in-line
#   OTHER_ARG='something with spaces in single quotes'
# )
#
# GCP_REGION='us-central1'
# GCP_PROJECT_ID='common-343019'
#
# DO_REGISTRY='nftoolkit'
#
# -- ENV -- #

# whatever you name the env file here
source docker.env

case "$1" in
  gcp)
    registry_url="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/images/$IMAGE_NAME"
    echo "pushing to GCP @ [$registry_url]"
  ;;
  do)
    if [[ "$(uname)" != "Linux" ]]; then
      echo "Digital Ocean images MUST be built on Linux"
      exit 1
    fi
    registry_url="registry.digitalocean.com/$DO_REGISTRY/$IMAGE_NAME"
    echo "pushing to digital ocean @ [$registry_url]"
  ;;
  *)
    echo 'unrecognized registry'
    exit 1
  ;;
esac

# as array of ARG=VALUE elements
# BUILD_ARGS=(
#   value as another env var
#   VERSION=$VERSION
#   value defined in-line
#   OTHER_ARG='something with spaces in single quotes'
# )
get_build_args() {
  # credit for concept: https://stackoverflow.com/a/67001488/7542831
  for build_arg in "${BUILD_ARGS[@]}"; do
    out+="--build-arg $build_arg "
  done

  echo -n "$out"
}

build_tag_and_push_to_registry() {
  build_args=`get_build_args`

  registry_tag_latest="$registry_url:latest"

  # NOTE: it will break if you quote $build_args
  # no fucking clue why but it does...
  docker build $build_args -t "$IMAGE_NAME:latest" .
  docker tag "$IMAGE_NAME:latest" "$registry_tag_latest"
    
  echo "pushing latest @ [$registry_tag_latest]"
  docker push "$registry_tag_latest"

  for tag in "${TAGS[@]}"; do
    registry_tag="$registry_url:$tag"
    
    docker build $build_args -t $IMAGE_NAME:"$tag" --target "$tag" .

    docker tag "$IMAGE_NAME:$tag" "$registry_tag"
    
    echo "pushing tag @ [$registry_tag]"
    docker push "$registry_tag"
  done
}

build_tag_and_push_to_registry
