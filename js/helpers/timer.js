/// This helper libary is managing timer objects.
// The libary supports the following methods
// - addTimer
// - cancelTimer
// - getTimerId
// - getActiveTimerId


// Create a timer and persist in cache
function addTimer(timerId, myfunction, seconds){
  // Cancel existing timer if exists
  if (getActiveTimerId(timerId)) {
    cancelTimer(timerId);
  }
  // Create timer
  var timer  = setTimeout(myfunction, seconds*1000);
  // persist timer in cache
  cache.private.put(timerId, timer); 
  // return timer if used ny sub module
  return timer;
}


// Get a timer object
function getTimerId(timerId) {
  // Get timer object from cache
  return cache.private.get(timerId);
}


// Get active timer if exists or return null value
function getActiveTimerId(timerId) {
  var timer = getTimerId(timerId);
  // Check if timer exists and is active
  if(timer) {
    return timer;
  }
  return null;
}


// function to cancel a timer
function cancelTimer(timerId) {
  // If timer exists and is active cancel it and renmove it from cache
  var timer = cache.private.get(timerId);
  if(timer) {
    clearTimeout(timer);
  }
  cache.private.put(timerId, null);
}
