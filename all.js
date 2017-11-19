// Particle login
var particle = new Particle();
var token;

var currState = null;

// state enum
var State = {
	OPEN: 0,
	CLOSED: 1,
	OPENING: 2,
	CLOSING: 3,
	MIDSTOP: 4,
	FAULT: 5,
	NONE: 6
}

// User class
class User {
	constructor(username, password, phone, garageId) {
		this.username = username;
		this.password = password;
		this.phone = phone;
		this.garageId = garageId;
		this.doorOpen = false;
		this.autoClose = false;
		this.autoCloseTime = 0;
		this.notif = false;
	}
}

var loggedIn = false;
var currUser = null;

// set to hold all users
var users = new Array();
initializeUser();
function initializeUser() {
	var user1 = new User("yihan", "12345", "3144358056", "garage1");
	var user2 = new User("cheng", "54321", "3144356666", "chenggarage");
	users.push(user1);
	users.push(user2);
	user1.doorOpen = true;
	currUser = user1;
}

var currentPage = "login-page";
var pages = ["login-page", "pwd-recovery-page", "register-page", "main", "camera-page"];
function changeVisibility(pageToShow) {
	var controlsButton = document.getElementById("controls-button");
	var camerasButton = document.getElementById("cameras-button");
	if (pageToShow == "controls-page") {
		controlsButton.disabled = true;
		camerasButton.disabled = false;
	}
	else if (pageToShow == "camera-page") {
		controlsButton.disabled = false;
		camerasButton.disabled = true;
	}
	document.getElementById(pageToShow).removeAttribute("hidden");
	document.getElementById(currentPage).setAttribute("hidden", '');
	currentPage = pageToShow;
}

document.getElementById("login-page-register-button").addEventListener("click", function(){
	changeVisibility("register-page");
});

document.getElementById("register-page-cancel-button").addEventListener("click", function(){
	changeVisibility("login-page");
});

// set initial display: autoclose disabled at the beginning
setAutoCloseDisplay();

// update page display given autoClose status
function setAutoCloseDisplay(){
		if (currUser.autoClose){
			document.getElementById("curr-auto-close").innerText = "Auto close if door open for "+ currUser.autoCloseTime+" seconds ";
			document.getElementById("auto-close-time-form").hidden = true;
			document.getElementById("controls-page-auto-cancel-button").style.display = "initial";
			document.getElementById("controls-page-auto-button").style.display = "none";
		}  else {
			document.getElementById("curr-auto-close").innerText = "No auto-close setup";
			document.getElementById("auto-close-seconds-input").value = "";
			document.getElementById("auto-close-time-form").hidden = false;
			document.getElementById("controls-page-auto-cancel-button").style.display = "none";
			document.getElementById("controls-page-auto-button").style.display = "initial";
		}
}

// connect to particle photon
function login(email, password) {
	particle.login({username: email, password: password}).then(
	  function(data) {
	    token = data.body.access_token;
			var devicesPr = particle.listDevices({ auth: token });
			devicesPr.then(
			  function(devices){
			  		changeVisibility("main");
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
							var array = data.data.split(',');
					    currState = parseInt(array[0], 10);
							currUser.autoClose = (array[1]=='1');
							currUser.autoCloseTime = parseInt(array[2], 10);
							console.log("AutoClose " + currUser.autoClose + ", " + currUser.autoCloseTime);
							// UPDATE UI
							if (currState != null){
								document.getElementById("controls-page").hidden = false;
								document.getElementById("loading-page").hidden = true;
								updateUI(currState);
							}
					  });
					});

					// update page UI: status, button values, button disabled boolean
					function updateUI(ns){
						var statusIndicator = document.getElementById("controls-page-status-indicator");
						var theBtn = document.getElementById("controls-page-close-button");
						var stopBtn = document.getElementById("controls-page-stop-button");

						setAutoCloseDisplay();

						switch (ns) {
							case State.OPEN:
									statusIndicator.innerHTML = "OPEN";
									theBtn.classList = "control-buttons";
									theBtn.disabled = false;
									theBtn.innerHTML = "CLOSE";
									stopBtn.innerHTML = "STOP";
									stopBtn.disabled = true;
								break;
							case State.CLOSED:
									statusIndicator.innerHTML = "CLOSED";
									theBtn.classList = "control-buttons";
									theBtn.disabled = false;
									theBtn.innerHTML = "OPEN";
									stopBtn.innerHTML = "STOP";
									stopBtn.disabled = true;
								break;
							case State.OPENING:
									statusIndicator.innerHTML = "OPENING";
									theBtn.classList = "disabled-buttons";
									theBtn.disabled = true;
									theBtn.innerHTML = "OPENING...";
									stopBtn.innerHTML = "STOP";
									stopBtn.disabled = false;
								break;
							case State.CLOSING:
									statusIndicator.innerHTML = "CLOSING";
									theBtn.classList = "disabled-buttons";
									theBtn.disabled = true;
									theBtn.innerHTML = "CLOSING...";
									stopBtn.innerHTML = "STOP";
									stopBtn.disabled = false;
								break;
							case State.MIDSTOP:
									statusIndicator.innerHTML = "STOPPED";
									theBtn.classList = "disabled-buttons";
									theBtn.disabled = true;
									theBtn.innerHTML = "DOOR IS STOPPED";
									stopBtn.innerHTML = "START";
									stopBtn.disabled = false;
								break;
							case State.FAULT:
									statusIndicator.innerHTML = "FAULT";
									theBtn.classList = "red-buttons";
									theBtn.disabled = true;
									theBtn.innerHTML = "FAULT DETECTED";
									stopBtn.innerHTML = "STOP";
									stopBtn.disabled = true;
								break;
						}
					}

					// Open/Close door button is clicked, publish event to photon
					document.getElementById("controls-page-close-button").addEventListener("click", function(){
						var prepareData = "cloud,";
						if (currState == State.OPEN){
							prepareData += State.CLOSING;
						} else if (currState == State.CLOSED){
							prepareData += State.OPENING;
						}
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
					document.getElementById("controls-page-stop-button").addEventListener("click", function(){
						var prepareData = "stop,";
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
					document.getElementById("controls-page-auto-cancel-button").addEventListener("click", function(){
						publishStopAutoClose = particle.publishEvent({name: 'setAutoClose', data: "0,1", auth: token, isPrivate: true});
						publishStopAutoClose.then(
							function(data) {
								if (data.body.ok) {
									currUser.autoClose = false;
									currUser.autoCloseTime = 0;
									setAutoCloseDisplay();
									console.log("stopAutoClose published succesfully");
								}
							},
							function(err) {
								alert("Cancel AutoClose FAILED");
								console.log("Failed to publish event: " + err);
							}
						);
					});

					// submit auto close is clicked, publish event to photon
					document.getElementById("controls-page-auto-button").addEventListener("click", function(){
						var seconds = document.getElementById("auto-close-seconds-input").value;
						if (seconds > 100 || seconds < 2){
							alert("AutoClose input invalid. (2-100)");
						} else{
							thisAutoCloseTime = seconds;
							publishAutoClose = particle.publishEvent({ name: 'setAutoClose', data: seconds+",0", auth: token, isPrivate: true });
							publishAutoClose.then(
							  function(data) {
							    if (data.body.ok) {
										currUser.autoClose = true;
										currUser.autoCloseTime = seconds;
										setAutoCloseDisplay();
										console.log("setAutoClose published succesfully");
									}
							  },
							  function(err) {
									alert("Start AutoClose FAILED");
							    console.log("Failed to publish event: " + err);
							  }
							);
						}
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