<?php

/*
*	Page initialization data 
*/
// Include the LDAP connection info
require_once("../../webdrink_info/ldapInfo.inc");
// Include configuration info
require_once("./config.php");

// Grab some necessary info from webauth
$user_data = array();
if (DEBUG) {
	$user_data['cn'] = "Ben Centra";
	$user_data['uid'] = "bencentra";
}
else {
	$user_data['uid'] = $_SERVER['WEBAUTH_USER'];
	$user_data['cn'] = $_SERVER['WEBAUTH_LDAP_CN'];
}

// Get some initial data from LDAP
$filter = "(uid=".$user_data['uid'].")";
$fields = array('memberOf', 'drinkBalance', 'ibutton');
$search = ldap_search($conn, $userDn, $filter, $fields);
$data = ldap_get_entries($conn, $search);

// Add it to the user_data array
$user_data['admin'] = in_array($ldapDrinkAdminGroup, $data[0]["memberof"]);
$user_data['credits'] = $data[0]["drinkbalance"][0];
$user_data['ibutton'] = $data[0]["ibutton"][0];

?>
<!DOCTYPE HTML>
<html ng-app="WebDrink" lang="en-us">
<head>
	<title>WebDrink 2.0</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<!-- Styles -->
	<link href="//maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css" rel="stylesheet" media="screen" type="text/css"/>
	<link href="css/main.css" rel="stylesheet" media="screen" type="text/css"/>
	<style type="text/css">
		body {
			padding-top: 10px;
			min-width: 320px;
		}
	</style>
	<!-- Scripts -->
	<script src="//ajax.googleapis.com/ajax/libs/angularjs/1.3.0/angular.min.js"></script>
	<script src="//ajax.googleapis.com/ajax/libs/angularjs/1.3.0/angular-route.min.js"></script>
	<script src="//ajax.googleapis.com/ajax/libs/angularjs/1.3.0/angular-sanitize.min.js"></script>
	<script src="//ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min.js"></script>
	<script src="//maxcdn.bootstrapcdn.com/bootstrap/3.2.0/js/bootstrap.min.js"></script>
	<script src="js/spin.min.js"></script>
	<script type="text/javascript">
		// Get the current user's info
		window.current_user = <?php echo json_encode($user_data); ?>;
		// Base URL of the API
		var baseUrl = "<?php echo API_BASE_URL; ?>";
		// Have the navbar collapse (on mobile) after a page is selected
		document.addEventListener("DOMContentLoaded", function() {
			jQuery('.navitem').click(function() {
				if (jQuery(window).width() <= 768)
					jQuery('#navbar').collapse("hide");
			});
		}, true);
	</script>
	<script type="text/javascript" src="js/app/app.js"></script>
	<script type="text/javascript" src="js/app/machines.js"></script>
</head>
<body ng-controller="RootCtrl">
	<main class="container" ng-view></main>
</body>
</html>
