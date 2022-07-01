#!/usr/bin/env bash

# -- ENV -- #
# SERVICE_NAME
# MONGO_ATLAS_API_PK
# MONGO_ATLAS_API_SK
# MONGO_ATLAS_API_PROJECT_ID
# -- ENV -- #

set -e

mongo_api_base_url='https://cloud.mongodb.com/api/atlas/v1.0'

check_for_deps() {
  deps=(
    bash
    curl
    jq
  )

 for dep in "${deps[@]}"; do
   if [ ! "$(command -v $dep)" ]
   then
    echo "dependency [$dep] not found. exiting"
    exit 1
   fi
 done
}

make_mongo_api_request() {
  local request_method="$1"
  local request_url="$2"
  local data="$3"

  curl \
    --silent \
    --user "$MONGO_ATLAS_API_PK:$MONGO_ATLAS_API_SK" --digest \
    --header "Accept: application/json" \
    --header "Content-Type: application/json" \
    --request "$request_method" "$request_url" \
    --data "$data"
}

get_access_list_endpoint() {
  echo -n "$mongo_api_base_url/groups/$MONGO_ATLAS_API_PROJECT_ID/accessList"
}

get_service_ip() {
  echo -n "$(curl https://ipinfo.io/ip -s)"
}

get_previous_service_ip() {
  local access_list_endpoint=$(get_access_list_endpoint)

  local previous_ip=$(make_mongo_api_request 'GET' "$access_list_endpoint" \
                      | jq --arg SERVICE_NAME "$SERVICE_NAME" -r \
                        '.results[]? as $results | $results.comment | if test("\\[\($SERVICE_NAME)\\]") then $results.ipAddress else empty end'
                    )

  echo "$previous_ip"
}

whitelist_service_ip() {
  local current_service_ip="$1"
  local comment="Hosted IP of [$SERVICE_NAME] [set@$(date +%s)]"

  if (( "${#comment}" > 80 )); then
    echo "comment field value will be above 80 char limit: \"$comment\""
    echo "comment would be too long due to length of service name [$SERVICE_NAME] [${#SERVICE_NAME}]"
    echo "change comment format or service name then retry. exiting to avoid mongo API failure"
    exit 1
  fi
  
  echo "whitelisting service IP [$current_service_ip] with comment value: \"$comment\""

  response=$(make_mongo_api_request \
              'POST' \
              "$(get_access_list_endpoint)?pretty=true" \
              "[
                {
                  \"comment\" : \"$comment\",
                  \"ipAddress\": \"$current_service_ip\"
                }
              ]" \
              | jq -r 'if .error then . else empty end'
            )

  if [[ -n "$response" ]];
  then
    echo 'API error whitelisting service'
    echo "$response"
    exit 1
  else
    echo "whitelist request successful"
    echo "waiting 60s for whitelist to propagate to cluster"
    sleep 60
  fi 
}

delete_previous_service_ip() {
  local previous_service_ip="$1"

  echo "deleting previous service IP address of [$SERVICE_NAME]"

  make_mongo_api_request \
    'DELETE' \
    "$(get_access_list_endpoint)/$previous_service_ip"
}

set_mongo_whitelist_for_service_ip() {
  local current_service_ip=$(get_service_ip)
  local previous_service_ip=$(get_previous_service_ip)

  if [[ -z "$previous_service_ip" ]]; then
    echo "service [$SERVICE_NAME] has not yet been whitelisted"

    whitelist_service_ip "$current_service_ip"
  elif [[ "$current_service_ip" == "$previous_service_ip" ]]; then
    echo "service [$SERVICE_NAME] IP has not changed"
  else  
    echo "service [$SERVICE_NAME] IP has changed from [$previous_service_ip] to [$current_service_ip]"

    delete_previous_service_ip "$previous_service_ip"
    whitelist_service_ip "$current_service_ip"
  fi
}

check_for_deps
set_mongo_whitelist_for_service_ip

# run CMD
exec "$@"
