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
      x[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablink");
  for (i = 0; i < x.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" tab-selected", "");
  }
  document.getElementById(tab).style.display = "block";
  evt.currentTarget.className += " tab-selected";
}

// timer item functions
document.getElementById("close-timer-item").addEventListener("click", function(){
	var pickDiv = document.getElementById("close-picker");
	if (pickDiv.hidden == false){
		pickDiv.hidden = true;
	}
	else {
		pickDiv.hidden = false;
		document.getElementById("open-picker").hidden = true;
	}
});

document.getElementById("open-timer-item").addEventListener("click", function(){
	var pickDiv = document.getElementById("open-picker");
	if (pickDiv.hidden == false){
		pickDiv.hidden = true;
	}
	else {
		pickDiv.hidden = false;
		document.getElementById("close-picker").hidden = true;
	}
});

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
					var DEVICE_ID = devices.body[0].id;

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
					particle.getEventStream({ deviceId: "mine", name: 'newState', auth: token }).then(function(stream) {
					  stream.on('event', function(data) {
							console.log(data.data);
					    currState = parseInt(data.data,10);
							console.log("current state: " + currState);
							// currUser.autoClose = (array[1]=='1');
							// currUser.autoCloseTime = parseInt(array[2], 10);
							// console.log("AutoClose " + currUser.autoClose + ", " + currUser.autoCloseTime);
							// UPDATE UI
							if (currState != null){
								document.getElementById("control-page").hidden = false;
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

					// Open/Close door button is clicked, publish event to photon
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

					// midstop button is clicked during opening/closing/mistop, publish event to photon
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

					// cancel auto close is clicked, publish event to photon
					// document.getElementById("controls-page-auto-cancel-button").addEventListener("click", function(){
					// 	publishStopAutoClose = particle.publishEvent({name: 'setAutoClose', data: "0,1", auth: token, isPrivate: true});
					// 	publishStopAutoClose.then(
					// 		function(data) {
					// 			if (data.body.ok) {
					// 				currUser.autoClose = false;
					// 				currUser.autoCloseTime = 0;
					// 				setAutoCloseDisplay();
					// 				console.log("stopAutoClose published succesfully");
					// 			}
					// 		},
					// 		function(err) {
					// 			alert("Cancel AutoClose FAILED");
					// 			console.log("Failed to publish event: " + err);
					// 		}
					// 	);
					// });

					// submit auto close is clicked, publish event to photon
					// document.getElementById("controls-page-auto-button").addEventListener("click", function(){
					// 	var seconds = document.getElementById("auto-close-seconds-input").value;
					// 	if (seconds > 100 || seconds < 2){
					// 		alert("AutoClose input invalid. (2-100)");
					// 	} else{
					// 		thisAutoCloseTime = seconds;
					// 		publishAutoClose = particle.publishEvent({ name: 'setAutoClose', data: seconds+",0", auth: token, isPrivate: true });
					// 		publishAutoClose.then(
					// 		  function(data) {
					// 		    if (data.body.ok) {
					// 					currUser.autoClose = true;
					// 					currUser.autoCloseTime = seconds;
					// 					setAutoCloseDisplay();
					// 					console.log("setAutoClose published succesfully");
					// 				}
					// 		  },
					// 		  function(err) {
					// 				alert("Start AutoClose FAILED");
					// 		    console.log("Failed to publish event: " + err);
					// 		  }
					// 		);
					// 	}
					// });

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
