/// This helper libary is managing timer objects.
// The libary supports the following methods
// - addTimer
// - cancelTimer
// - getTimer
// - getActiveTimer
// - setTimer


// Create a timer and persist in cache
function addTimer(timerId, myfunction, seconds){
  // Create timer
  var timer  = setTimeout(myfunction, seconds*1000);
  // persist timer in cache
  cache.put(timerId, timer); 
  // return timer if used ny sub module
  return timer;
}


// Get a timer object
function getTimer(timerId) {
  // Get timer object from cache
  return cache.get(timerId);
}


// Get active timer if exists or return null value
function getActiveTimer(timerId) {
  var timer = getTimer(timerId);
  // Check if timer exists and is active
  if(timer && timer.isActive()) {
    return timer;
  }
  return null;
}


// Set a timer, existing timers will be canceled and new timers started
function setTimer(timerId, myfunction, seconds){
  // Cancel existing timer if exists
  if (getActiveTimer(timerId)) {
    cancelTimer(timerId);
  }
  // add a new timer object
  addTimer(timerId, myfunction, seconds); 
}


// function to cancel a timer
function cancelTimer(timerId) {
  // If timer exists and is active cancel it and renmove it from cache
  var timer = cache.get(timerId);
  if(timer && timer.isActive()) {
    timer.cancel();
  }
  cache.put(timerId, null);
}
