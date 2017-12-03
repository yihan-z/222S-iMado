 var pages = ["login-page", "pwd-recovery-page", "register-page", "control-page", "timer-page", "loading-page"];

 // User class
 class User {
 	constructor(username, password) {
 		this.username = username;
 		this.password = password;
 		this.blindState = State.DOWNCLOSED;
 		this.autoCloseUp = false;
 		this.autoCloseDown = false;
 		this.autoOpen = false;
 		this.autoCloseTime = 0;
 	}
 }

 var currUser = null;
 var currState = null;

 // state enum
 var State = {
 	OPEN: 0,
 	UPCLOSED: 1,
 	DOWNCLOSED: 2,
 	MOVINGUP: 3,
 	MOVINGDOWN: 4,
 	FAULT: 5,
 }

 // functions for page change
 function changeVisibility(pageToShow){
 	for (var i = 0; i < pages.length; i++){
 		console.log(pages[i]);
 		document.getElementById(pages[i]).hidden = true;
 	}
 	document.getElementById(pageToShow).hidden = false;
 }

 document.getElementById("login-page-register-button").addEventListener("click", function(){
 	changeVisibility("register-page");
 });

 document.getElementById("login-page-recover-button").addEventListener("click", function(){
 	changeVisibility("pwd-recovery-page");
 });

 document.getElementById("register-page-cancel-button").addEventListener("click", function(){
 	changeVisibility("login-page");
 });

 document.getElementById("pwd-recovery-page-cancel-button").addEventListener("click", function(){
 	changeVisibility("login-page");
 });

 document.getElementById("pwd-recovery-page-register-button").addEventListener("click", function(){
 	changeVisibility("register-page");
 });

 // tab bar function
 function openTab(evt, tab) {
   var i, x, tablinks;
   x = document.getElementsByClassName("tab-content");
   for (i = 0; i < x.length; i++) {
       x[i].hidden = true;
   }
   // tablinks = document.getElementsByClassName("tablink");
   // for (i = 0; i < x.length; i++) {
   //     tablinks[i].className = tablinks[i].className.replace(" tab-selected", "");
   // }
   document.getElementById(tab).hidden = false;
   // evt.currentTarget.className += " tab-selected";
 }

 // timer item functions
 document.getElementById("close-timer-item").addEventListener("click", function(){
  switchPickers("close-picker");
 });

 document.getElementById("open-timer-item").addEventListener("click", function(){
  switchPickers("open-picker");
 });

 document.getElementById("light-open-timer-item").addEventListener("click", function(){
   switchPickers("light-open-picker");
 });

 document.getElementById("light-close-timer-item").addEventListener("click", function(){
   switchPickers("light-close-picker");
 });

function switchPickers(pickerName){
  var pickDiv = document.getElementById(pickerName);
  var isHidden = pickDiv.hidden;
  var pickers = document.getElementsByClassName("timer-item-pickers");
  for (var i = 0; i < pickers.length; i++){
    pickers[i].hidden = true;
  }
  pickDiv.hidden = !isHidden;
}
 // Particle login
 var particle = new Particle();
 var token;

 // connect to particle photon
 function login(email, password) {
 	particle.login({username: email, password: password}).then(
 	  function(data) {
 	    token = data.body.access_token;
 			var devicesPr = particle.listDevices({ auth: token });
 			devicesPr.then(
 			  function(devices){
 			  		changeVisibility("loading-page");
 			  		console.log(devices.body);
 					// var DEVICE_ID = devices.body[0].id;

 					// publish get initial state event to retrieve current state when page loads
 					var publishGetInitState =particle.publishEvent({ name: 'getInitState', data: "", auth: token, isPrivate: true });
 					publishGetInitState.then(
 					  function(data) {
 					    if (data.body.ok) { console.log("getInitState published succesfully") }
 					  },
 					  function(err) {
 					    console.log("Failed to publish event: " + err)
 					  }
 					);

 					// listens for photon publishing state change, and update page state accordingly
 					particle.getEventStream({ deviceId: 'mine', name: 'newState', auth: token }).then(function(stream) {
 					  stream.on('event', function(data) {
 							// console.log(data.data);
 					    currState = parseInt(data.data,10);
 							console.log("current state: " + currState);
              // UPDATE UI
 							if (currState != null){
                var controlPageTemp = document.getElementById("control-page");
								var timerPageTemp = document.getElementById("timer-page");
								if (controlPageTemp.hidden && timerPageTemp.hidden){
									controlPageTemp.hidden = false;
								}
								// document.getElementById("control-page").hidden = false;
								document.getElementById("loading-page").hidden = true;
								updateUI(currState);
 							}
 					  });
 					});

 					// update page UI: status, button values, button disabled boolean
 					function updateUI(ns){
 						var upButton = document.getElementById("close-up-button");
 						var statusIndicator = document.getElementById("status-indicator");
 						var downButton = document.getElementById("close-down-button");
 						// setAutoCloseDisplay();

 						switch (ns) {
 							case State.OPEN:
 									upButton.classlist = "control-buttons";
 									upButton.disabled = false;
 									downButton.classList = "control-buttons";
 									downButton.disabled = false;
 									statusIndicator.style.backgroundImage = "url('img/sunny.png')";
 								break;
 							case State.DOWNCLOSED:
 									upButton.classlist = "control-buttons";
 									upButton.disabled = false;
 									downButton.classList = "control-buttons control-button-selected";
 									downButton.disabled = true;
 									statusIndicator.style.backgroundImage = "url('img/fully-down.png')";
 								break;
 							case State.UPCLOSED:
 									upButton.classlist = "control-buttons control-button-selected";
 									upButton.disabled = true;
 									downButton.classList = "control-buttons";
 									downButton.disabled = false;
 									statusIndicator.style.backgroundImage = "url('img/fully-up.png')";
 								break;
 							case State.MOVINGUP:
 									upButton.disabled = true;
 									downButton.disabled = true;
 									statusIndicator.style.backgroundImage = "url('img/loading.png')";
 								break;
 							case State.MOVINGDOWN:
 									upButton.disabled = true;
 									downButton.disabled = true;
 									statusIndicator.style.backgroundImage = "url('img/loading.png')";
 								break;
 							case State.FAULT:
 									upButton.disabled = true;
 									downButton.disabled = true;
 									statusIndicator.style.backgroundImage = "url('img/warning.png')";
 								break;
 						}
 					}

 					// move up button is clicked, publish event to photon
 					document.getElementById("close-up-button").addEventListener("click", function(){
 						var prepareData = "up";
 						var publishEventPr = particle.publishEvent({ name: 'cloudChangeState', data: String(prepareData), auth: token, isPrivate: true });
 						publishEventPr.then(
 						  function(data) {
 						    if (data.body.ok) { console.log("Event published succesfully") }
 						  },
 						  function(err) {
 						    console.log("Failed to publish event: " + err)
 						  }
 						);
 					});

 					// move down button is clicked during opening/closing/mistop, publish event to photon
 					document.getElementById("close-down-button").addEventListener("click", function(){
 						var prepareData = "down";
 						var publishStopClicked = particle.publishEvent({name: 'cloudChangeState', data: String(prepareData), auth: token, isPrivate: true});
 						publishStopClicked.then(
 							function(data) {
 						    if (data.body.ok) { console.log("stopClick published succesfully") }
 						  },
 						  function(err) {
 						    console.log("Failed to publish event: " + err)
 						  }
 						);
 					});

					// submit auto close is clicked, publish event to photon
					document.getElementById("auto-close-submit").addEventListener("click", function(){
						var newTime = document.getElementById("close-time").value;
						if (newTime != ""){
							var timeNumbers = newTime.split(":");
							var hour = parseInt(timeNumbers[0]);
							var minute = parseInt(timeNumbers[1]);
							publishAutoClose = particle.publishEvent({ name: 'autoControl', data: "close," + hour + ":" + minute, auth: token, isPrivate: true });
 							publishAutoClose.then(
 							  function(data) {
 							    if (data.body.ok) {
										console.log("publish success");
 									}
 							  },
 							  function(err) {
 									alert("Start AutoClose FAILED");
 							    console.log("Failed to publish event: " + err);
 							  }
 							);
						} else {
							alert("INVALID Time Input!");
						}
					});

					// cancel auto close is clicked, publish event to photon
					document.getElementById("auto-close-cancel").addEventListener("click", function(){
						publishStopAutoClose = particle.publishEvent({name: 'autoControl', data: "close,0", auth: token, isPrivate: true});
						publishStopAutoClose.then(
							function(data) {
								if (data.body.ok) {
									console.log("publish success");
								}
							},
							function(err) {
								alert("Cancel AutoClose FAILED");
								console.log("Failed to publish event: " + err);
							}
						);
					});

					// submit auto open is clicked, publish event to photon
					document.getElementById("auto-open-submit").addEventListener("click", function(){
						var newTime = document.getElementById("open-time").value;
						if (newTime != ""){
							var timeNumbers = newTime.split(":");
							var hour = parseInt(timeNumbers[0]);
							var minute = parseInt(timeNumbers[1]);
							publishAutoOpen = particle.publishEvent({ name: 'autoControl', data: "open," + hour + ":" + minute, auth: token, isPrivate: true });
							publishAutoOpen.then(
								function(data) {
									if (data.body.ok) {
										console.log("publish success");
									}
								},
								function(err) {
									alert("Start AutoOpen FAILED");
									console.log("Failed to publish event: " + err);
								}
							);
						} else {
							alert("INVALID Time Input!");
						}
					});

					// cancel auto open is clicked, publish event to photon
					document.getElementById("auto-open-cancel").addEventListener("click", function(){
						publishStopAutoOpen = particle.publishEvent({name: 'autoControl', data: "open,0", auth: token, isPrivate: true});
						publishStopAutoOpen.then(
							function(data) {
								if (data.body.ok) {
									console.log("publish success");
								}
							},
							function(err) {
								alert("Cancel AutoClose FAILED");
								console.log("Failed to publish event: " + err);
							}
						);
					});

          // submit light open is clicked, publish event to photon
					document.getElementById("light-open-submit").addEventListener("click", function(){
            var data = "";
            var dim = document.getElementById("light-open-dim").checked;
            data = dim?"dim":"bright";
						publishLightOpen = particle.publishEvent({ name: 'autoControl', data: "lightopen," + data, auth: token, isPrivate: true });
						publishLightOpen.then(
							function(data) {
								if (data.body.ok) {
									console.log("publish success");
								}
							},
							function(err) {
								alert("Start Light Open FAILED");
								console.log("Failed to publish event: " + err);
							}
						);

					});

					// cancel light open is clicked, publish event to photon
					document.getElementById("light-open-cancel").addEventListener("click", function(){
						publishStopLightOpen = particle.publishEvent({name: 'autoControl', data: "lightopen,0", auth: token, isPrivate: true});
						publishStopLightOpen.then(
							function(data) {
								if (data.body.ok) {
									console.log("publish success");
								}
							},
							function(err) {
								alert("Cancel Light Open FAILED");
								console.log("Failed to publish event: " + err);
							}
						);
					});

          // submit light close is clicked, publish event to photon
          document.getElementById("light-close-submit").addEventListener("click", function(){
            var data = "";
            var dim = document.getElementById("light-close-dim").checked;
            data = dim?"dim":"bright";
            publishLightClose = particle.publishEvent({ name: 'autoControl', data: "lightclose," + data, auth: token, isPrivate: true });
            publishLightClose.then(
              function(data) {
                if (data.body.ok) {
                  console.log("publish success");
                }
              },
              function(err) {
                alert("Start Light Close FAILED");
                console.log("Failed to publish event: " + err);
              }
            );

          });

          // cancel light close is clicked, publish event to photon
          document.getElementById("light-close-cancel").addEventListener("click", function(){
            publishStopLightClose = particle.publishEvent({name: 'autoControl', data: "lightclose,0", auth: token, isPrivate: true});
            publishStopLightClose.then(
              function(data) {
                if (data.body.ok) {
                  console.log("publish success");
                }
              },
              function(err) {
                alert("Cancel Light Close FAILED");
                console.log("Failed to publish event: " + err);
              }
            );
          });

					particle.getEventStream({ deviceId: "mine", name: 'autoControlSuccess', auth: token }).then(function(stream) {
						stream.on('event', function(data) {
							console.log("photon success");
							var parsedData = data.data.split(",");
							if (parsedData[0] == "open"){
								if (parsedData[1] == "0"){
									currUser.autoOpen = false;
									currUser.autoOpenTime = "";
									setAutoControlDisplay("clear", parsedData[0], "");
								} else {
									currUser.autoOpen = true;
									var hourmin = parsedData[1].split(":");
									var hour = parseInt(hourmin[0])<10?("0" + hourmin[0]):hourmin[0];
									var minute = parseInt(hourmin[1])<10?("0" + hourmin[1]):hourmin[1];
									currUser.autoOpenTime = hour + ":" + minute;
									setAutoControlDisplay("update", parsedData[0], currUser.autoOpenTime);
								}
							} else {
								if (parsedData[1] == "0"){
									currUser.autoClose = false;
									currUser.autoCloseTime = "";
									setAutoControlDisplay("clear", "close", "");
								} else {
									currUser.autoClose = true;
									var hourmin = parsedData[1].split(":");
									var hour = parseInt(hourmin[0])<10?("0" + hourmin[0]):hourmin[0];
									var minute = parseInt(hourmin[1])<10?("0" + hourmin[1]):hourmin[1];
									currUser.autoCloseTime = hour + ":" + minute;
									setAutoControlDisplay("update", "close", currUser.autoCloseTime);
								}
							}
						});
					});

 			  },
 			  function(err) {
 			    console.log('List devices call failed: ', err);
 			  }
 			);
 	  },
 	  function (err) {
 	    console.log('Could not log in.', err);
 	    alert("ERROR: Could not log in. Wrong email and password pair");
 	  }
 	);
 }


 //account creation
 var productId = "6203"

 //relative info
 var clientId = "ranger-app-2776"
 var clientToken = "ca90b565f0d411b6eeefc7cc75f2377db4e6a13a"
 var deviceOneId = "480028001451353432393433"
 var deviceTwoId = "48005e000e51353532343635"
 var email = ""
 var password = ""
 var customerToken = "LEAVE ALONE"

 //function used to test email input
 function validateEmail(email) {
     var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
     if (filter.test(email)) {
     	return true;
 	}
     alert('Please provide a valid email address');
 	return false;
 }

 //function used to create account
 particle.createCustomer = function ({ productId, clientId, clientToken, customerEmail, customerPassword }) {
  const auth = clientId + ':' + clientToken;
  const uri = `/v1/products/${productId}/customers`;
  return this.post(uri, {productIdOrSlug:productId, client_id:clientId, client_secret:clientToken, email:customerEmail, password:customerPassword
  }, auth, this.context);
 }

 //sign up
 document.getElementById("register-page-signup-button").addEventListener("click", signUp);

 function signUp() {
 	var regEmail = document.getElementById("reg-email").value;
 	var regPwd = document.getElementById("reg-pwd").value;
 	var regPwdConfirm = document.getElementById("reg-pwd-confirm").value;

 	var isValidEmail = validateEmail(regEmail);

 	if (!isValidEmail) {
 		alert("ERROR: please enter a valid email address");
 	}
 	else if (regPwd == "") {
 		alert("ERROR: please enter a password. ");
 	}
 	else if (regPwdConfirm == "") {
 		alert("ERROR: please confirm your password. ");
 	}
 	else if (regPwd != regPwdConfirm){
 		alert("Password inconsistent. Please enter again");
 	}
 	else { // data valid, registering new user
 		console.log(regEmail);
 		console.log(regPwd);
 		email = regEmail;
 		password = regPwd;
 		particle.createCustomer( {productId:productId, clientId:clientId, clientToken:clientToken, customerEmail:email, customerPassword:password} )
 		 .then(saveTokenAndClaimDeviceOne)
 		 .then(claimDeviceTwo)
 		 .then(doneClaimingDevices)
 		 .catch(errorClaimingDevices)

 	}
 }

 function saveTokenAndClaimDeviceOne(data) {
  console.log("Success creating customer; Claiming Device One");
  console.dir(data)
  customerToken = data.body.access_token;
  // Return a "promise" object (so .then() can be used)
  return particle.claimDevice({deviceId:deviceOneId, requestTransfer:true, auth:customerToken})
 }

 function claimDeviceTwo(data) {
  console.log("Success claiming device one; Claiming Device Two");
  console.dir(data)
  // Return a "promise" object (so .then() can be used)
  return particle.claimDevice({deviceId:deviceTwoId, requestTransfer:true, auth:customerToken})
 }

 function doneClaimingDevices() {
  console.log("Done Claiming Devices");
  login(email, password);
 }

 function errorClaimingDevices() {
  console.log("Error Claiming Devices");
  email = "";
  password = "";
 }

 //log in
 document.getElementById("login-page-login-button").addEventListener('click', function () {
 	var email = document.getElementById("uname").value;
 	var password = document.getElementById("pwd").value;
 	if (email == "" || password == "") {
 		alert("ERROR: please enter both the email address and password");
 	} else if (!validateEmail(email)){
 		alert("ERROR: please enter a valid email address");
 	} else {
 		login(email, password);
 	}
 });
