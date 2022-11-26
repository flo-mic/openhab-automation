#!/bin/bash

# Script variables
SCRIPT_PATH=$(dirname "$0")
# Define script config file
CONF=${SCRIPT_PATH}/reload.conf

# Default config variables
LAST_RUN="1970-01-01 00:00:00"

# If a config file exists, load values in script
if test -f "$CONF"; then
    . $CONF
fi

# Get all script files which were modified since last execution time
echo "Checking for updated script files since \"${LAST_RUN}\""
MODIFIED_FILES=$(find $SCRIPT_PATH -newermt "${LAST_RUN}" -type f | egrep "[.]js")

# Touch all script files to load them in cach again
for MODIFIED_FILE in $MODIFIED_FILES
do
  echo "Reloading file: ${MODIFIED_FILE/${SCRIPT_PATH}\//}"
  kubectl exec -it -n openhab svc/openhab -- su -s /bin/touch openhab $(echo ${MODIFIED_FILE/${SCRIPT_PATH}/conf\/automation})
done

# Save new configuration to file system
CURRENT_TIME=$(date -d "$time + 1 seconds" "+%Y-%m-%d %H:%M:%S")
echo "LAST_RUN=\"${CURRENT_TIME}\"" > $CONF