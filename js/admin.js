// Routes
app.config(['$routeProvider', function($routeProvider) {
	$routeProvider.
		when('/admin/users', {
			templateUrl: 'partials/admin/users.html',
			controller: 'UserCtrl'
		}).
		when('/admin/items', {
			templateUrl: 'partials/admin/items.html',
			controller: 'ItemCtrl'
		}).
		when('/admin/temps', {
			templateUrl: 'partials/admin/temps.html',
			controller: 'TempCtrl'
		}).
		when('/admin/logs', {
			templateUrl: 'partials/admin/logs.html',
			controller: 'LogsCtrl'
		});
}]);

// User Service - For getting and updating information about users (drink credits, etc)
app.factory("UserService", function($http, $window, $log) {
	return {	
		// Search for usernames that match a string
		searchUsers: function(search, successCallback, errorCallback) {
			$http({
				method: "GET",
				url: baseUrl+"users/search",
				params: {"uid": search}
			}).success(successCallback).error(errorCallback);
		},
		// Get the balance of a user's drink credits
		getCredits: function(uid, successCallback, errorCallback) {
			$http({
				method: "GET",
				url: baseUrl+"users/credits",
				params: {"uid": uid}
			}).success(successCallback).error(errorCallback);
		},
		// Update the drink credit amount for a user
		updateCredits: function(uid, amount, type, successCallback, errorCallback) {
			$http({
				method: "POST",
				url: baseUrl+"users/credits",
				data: jQuery.param({"uid":uid, "value":amount, "type":type}),
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(successCallback).error(errorCallback);
		}
	};
});

// Item Service - For adding, updating, and deleting drink items
app.factory("ItemService", function($http, $window) {
	return {
		// Add a new item
		addItem: function(name, price, successCallback, errorCallback) {
			$http({
				method: "POST",
				url: baseUrl+"items/add",
				data: jQuery.param({"name": name, "price": price}),
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(successCallback).error(errorCallback);
		},
		updateItem: function(data, successCallback, errorCallback) {
			$http({
				method: "POST",
				url: baseUrl+"items/update",
				data: jQuery.param(data),
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(successCallback).error(errorCallback);
		},
		deleteItem: function(itemId, successCallback, errorCallback) {
			$http({
				method: "POST",
				url: baseUrl+"items/delete",
				data: jQuery.param({"item_id": itemId}),
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			}).success(successCallback).error(errorCallback);
		}
	};
});

// Temp Service - for getting temperature data
app.factory("TempService", function($http, $window) {
	return {
		getTempsOne: function(machineId, successCallback, errorCallback) {
			$http({
				method: "GET",
				url: baseUrl+"temps/machines",
				params: {"machine_id": machineId}
			}).success(successCallback).error(errorCallback);
		}
	};
});

// Logs Service - for getting drop logs
app.factory("LogsService", function($http, $window) {
	return {
		// Use DropService instead
	};
});

// Controller for the Manage Users page
function UserCtrl($scope, $log, UserService, DropService, MachineService) {
	$scope.searchTerm = "";				// Username being searched for
	$scope.searchResults = {};			// All matching usernames from a search
	$scope.activeUser = {				// Current user being managed
		uid: "",
		cn: "",
		credits: 0,
		drops: []
	};
	$scope.creditChange = 0;			// Value to adjust drink credits by
	$scope.transactionType = "add";		// How credits are being adjusted (add, subtract, update)
	$scope.alert = new $scope.Alert();	    // Alert for success/failure of credit change
	$scope.dropsToLoad = 5;				// How many entries of drop history to load
	// Drops Table directive config
	$scope.drops_table = new $scope.DropsTable($scope.activeUser.drops, $scope.activeUser.cn + "'s Recent Drops", {
		showMore: false
	});

	// Change the transaction type for updating credits (add, subtract, or update)
	$scope.changeType = function(type) {
		// If type is invalid, default to add
		if ($scope.transactionType != "add" && 
			$scope.transactionType != "subtract" && 
			$scope.transactionType != "update") {
			$scope.transactionType = "add";
		}
		// Change the transaction type
		else {
			$scope.transactionType = type;
		}
	}

	// Search for users whose UID matches the search term
	$scope.getUsers = function() {
		//$log.log($scope.searchTerm);
		// Only search if the search term is not empty
		if ($scope.searchTerm.length > 0) {
			// Search for matching usernames
			UserService.searchUsers($scope.searchTerm,
				function (response) {
					if (response.status) {
						// Update the matched set of usernames
						$scope.searchResults = response.data;
						//$log.log(response.data);
					}
					else {
						$log.log(response.message);
					}
				},
				function (error) {
					$log.log(error);
				}
			);
		}
	}

	// Get the drink credit balance for the active user
	$scope.getUserCredits = function() {
		UserService.getCredits($scope.activeUser.uid, 
			function (response) {
				if (response.status) {
					$scope.activeUser.credits = response.data;
				}
				else {
					$log.log(response.message);
				}
			},
			function (error) {
				$log.log(response.message);
			}
		);
	}

	// Get the drop history for the active user
	$scope.getUserDrops = function() {
		var data = {
			"uid": $scope.activeUser.uid,
			"limit": $scope.dropsToLoad
		};
		DropService.getDrops(data,
			function (response) {
				if (response.status) {
					$scope.activeUser.drops = response.data;
					$scope.drops_table.drops = $scope.activeUser.drops;
				}
				else {
					$log.log(response.message);
				}
			},
			function (error) {
				$log.log(error);
			}
		);
	}

	$scope.loadUserEnter = function(e) {
		if (e.which==13)
    		$scope.loadUser();
	}

	// Set the active user's data
	$scope.loadUser = function() {
		if ($scope.searchTerm != "") {
			var foundUser = false;
			var i = 0;
			for (i = 0; i < $scope.searchResults.length; i++) {
				if ($scope.searchTerm == $scope.searchResults[i].uid) {
					foundUser = $scope.searchResults[i];
					//$log.log("found it: " + foundUser.uid)
					break;
				}
			}
			if (!foundUser) {
				return;
			}
			// Set the common name and uid of the active user
			$scope.activeUser.cn = foundUser.cn;
			$scope.activeUser.uid = foundUser.uid;
			//$log.log($scope.activeUser);
			// Get the active user's drink credit balance and drop history
			$scope.getUserCredits();
			$scope.getUserDrops();
			$scope.drops_table.title = $scope.activeUser.cn + "'s Recent Drops";
		}
	}

	// Update the active user's drink credit balance
	$scope.updateCredits = function() {
		var newCredits = 0;
		// Adjust the user's credits based on the transaction type
		if ($scope.transactionType == "add") {
			newCredits = Number($scope.activeUser.credits) + Number($scope.creditChange);
		}
		else if ($scope.transactionType == "subtract") {
			newCredits = Number($scope.activeUser.credits) - Number($scope.creditChange);
		}
		else if ($scope.transactionType == "adjust") {
			newCredits = $scope.creditChange;
		}
		else {
			// This shouldn't happen
		}
		// Update the user's credits in LDAP
		UserService.updateCredits($scope.activeUser.uid, newCredits, 
			function (response) {
				if (response.status) {
					$scope.alert.type = "alert-success";
					$scope.alert.message = "Credits updated successfully!"
					$scope.activeUser.credits = newCredits;
				}
				else {
					$scope.alert.type = "alert-danger";
					$scope.alert.message = response.message;
				}
				// Show the success/failure alert
				$scope.alert.show = true;
			},
			function (error) {
				$log.log(error);
			}
		);
	}

	$scope.updateCredits = function() {
		var type = $scope.transactionType;
		var amount = $scope.creditChange;
		// If using the "adjust" feature, convert it to add or subtract
		if ($scope.transactionType == "adjust") {
			if ($scope.creditChange - $scope.activeUser.credits >= 0) {
				amount = $scope.creditChange - $scope.activeUser.credits;
				type = "add";
			}
			else {
				amount = $scope.activeUser.credits - $scope.creditChange;
				type = "subtract";
			}
		}
		// Update the user's credits in LDAP
		UserService.updateCredits($scope.activeUser.uid, amount, type,
			function (response) {
				if (response.status) {
					$scope.alert.type = "alert-success";
					$scope.alert.message = "Credits updated successfully!"
					$scope.activeUser.credits = response.data;
					if ($scope.activeUser.uid == $scope.current_user.uid) {
						$scope.current_user.credits = response.data;
					}
				}
				else {
					$scope.alert.type = "alert-danger";
					$scope.alert.message = response.message;
				}
				// Show the success/failure alert
				$scope.alert.show = true;
			},
			function (error) {
				$log.log(error);
			}
		);
	}
}

// Controller for the Manage Items page
function ItemCtrl($scope, $log, ItemService, MachineService) {
	$scope.items = new Array();		// All drink items
	$scope.currentItem = {};		// Current item being edited/deleted
	$scope.newItem = {				// New item being added
		item_name: "",
		item_price: 0,
		item_id: 0,
		state: "active"
	};		
	$scope.updateItem = {};			// Temporary item for updates	
	$scope.alert = new $scope.Alert();	// Alert for success/failure of adding an item
	$scope.message = "";			// Message to display after edit/delete

	// Initialize data, get a list of all drink items
	MachineService.getItemAll(
		function (response) {
			if (response.status) {
				$scope.items = response.data;
			}
			else {
				$log.log(response.message);
			}
		},
		function (error) {
			$log.log(error);
		}
	);

	// Add the newItem to the database
	$scope.addItem = function() {
		// Handle empty name
		if ($scope.newItem.item_name == "") {
			$scope.alert.type = "alert-danger";
			$scope.alert.message = "Invalide name: can't be empty!";
			$scope.alert.show = true;
			return;
		}
		// Handle undefined price
		if (typeof $scope.newItem.item_price === "undefined") {
			$scope.alert.type = "alert-danger";
			$scope.alert.message = "Invalid price; must be a positive integer!";
			$scope.alert.show = true;
			return;
		}	
		// Add the item to the database
		ItemService.addItem($scope.newItem.item_name, $scope.newItem.item_price,
			function (response) {
				if (response.status) {
					// Set the item ID and state of the new item
					$scope.newItem.item_id = response.data; //Number($scope.items[$scope.items.length - 1].item_id) + 1;
					$scope.newItem.state = "active";
					// Add the new item to the items array
					$scope.items.push.call($scope.items, $scope.newItem);
					// Reset the new item
					$scope.newItem = { item_name: "", item_price: 0 };
					// Show the alert
					$scope.alert.type = "alert-success"; 
					$scope.alert.message = "Item added successfully!";
				}
				else {
					$scope.alert.type = "alert-danger"; 
					$scope.alert.message = response.message;
					//$log.log(response.message);
				}
				$scope.alert.show = true;
			},
			function (error) {
				$log.log(error);
			}
		);
	}

	// Set the item to be updated 
	$scope.editItem = function(item) {
		$scope.currentItem = item;
		$scope.updateItem.item_id = $scope.currentItem.item_id;
		$scope.updateItem.item_name = $scope.currentItem.item_name;
		$scope.updateItem.item_price = Number($scope.currentItem.item_price);
		$scope.updateItem.state = $scope.currentItem.state;
	}

	// Save the updated item in the database
	$scope.saveItem = function() {
		// Handle empty name
		if ($scope.updateItem.item_name == "") {
			$scope.message = "Invalide name: can't be empty!";
			jQuery("#saveItemModal").modal('show');
			return;
		}
		// Handle undefined price
		if (typeof $scope.updateItem.item_price === "undefined") {
			$scope.message = "Invalid price; must be a positive integer!";
			jQuery("#saveItemModal").modal('show');
			return;
		}	
		var data = {
			item_id: $scope.updateItem.item_id,
			name: $scope.updateItem.item_name,
			price: $scope.updateItem.item_price,
			state: $scope.updateItem.state
		};
		ItemService.updateItem(data,
			function (response) {
				if (response.status) {
					// Update the currentItem to reflect changes
					$scope.currentItem.item_name = $scope.updateItem.item_name;
					$scope.currentItem.item_price = Number($scope.updateItem.item_price);
					$scope.currentItem.state = $scope.updateItem.state;
					$scope.message = "Item updated successfully!";
				}
				else {
					$scope.message = response.message;
				}
				jQuery("#saveItemModal").modal('show');
			},
			function (error) {
				$log.log(error);
			}
		);
	}

	// Lookup an item by id
	$scope.lookupItemIndex = function (id) {
		for (var i = 0; i < $scope.items.length; i++) {
			if ($scope.items[i].item_id == id) {
				return i;
			}
		}
	}

	// Prepare an item to be deleted 
	$scope.confirmDelete = function(item) {
		$scope.currentItem = item;
	}

	// Delete an item from the database
	$scope.deleteItem = function() {
		ItemService.deleteItem($scope.currentItem.item_id,
			function (response) {
				if (response.status) {
					// Remove the item from the items array
					var indexToRemove = $scope.lookupItemIndex($scope.currentItem.item_id);
					$scope.items.splice(indexToRemove, 1);
					$scope.message = "Item deleted!";
				}
				else {
					$scope.message = response.message;
				}
				jQuery("#deleteModal").modal('show');
			},
			function (error) {
				$log.log(error);
			}
		);
	}

}

// Controller for the Machine Temperatures page
function TempCtrl($scope, $log, TempService) {
	// Get a machine's tempereature data
	$scope.getMachineTemps = function(machineId) {
		TempService.getTempsOne(machineId, 
			function (response) {
				if (response.status) {
					$scope.drawChart(machineId, response.data);
				}
				else {
					$log.log(response.message);
				}
			},
			function (error) {
				$log.log(error);
			}
		);
	}

	// Draw a temperature chart
	$scope.drawChart = function(id, data) {
		jQuery(function () {
			console.log("drawChart("+id+")");
		    jQuery("#"+$scope.machines[id].name).highcharts({
		        chart: {
		            type: 'line'
		        },
		        title: {
		            text: $scope.machines[id].display_name + ' Temperatures'
		        },
		        xAxis: {
		            title: {
		            	text: 'Time'
		            },
		            type: 'datetime'
		        },
		        yAxis: {
		            title: {
		                text: 'Temperature'
		            }
		        },
		        series: [{
		            name: $scope.machines[id].display_name,
		            data: data
		        }]
		    });
		    console.log("done");
		});
	}

	// Get temperature data for each machine
	for (var machine in $scope.machines) {
		$scope.getMachineTemps(machine);
	}
}

// Controller for the Drop Logs page
function LogsCtrl($scope, $log, LogsService, DropService) {
	// Initialize scope variables
	$scope.logs = new Array();	// List of all user drops
	$scope.pagesLoaded = 0;		// How many pages of drops have been loaded
	$scope.dropsToLoad = 50;	// How many drops to load at a time
	// Drops Table directive config
	$scope.drops_table = new $scope.DropsTable($scope.logs, "Drop Logs", {
		showUser: true
	});

	// Get a user's drop history
	$scope.getDrops = function() {
		var data = {
			"limit": $scope.dropsToLoad,
			"offset": $scope.dropsToLoad * $scope.pagesLoaded
		};
		DropService.getDrops(data,
			function (response) {
				if (response.status) {
					$scope.logs = $scope.logs.concat(response.data);
					$scope.drops_table.drops = $scope.logs;
					$scope.pagesLoaded += 1;
				}
				else {
					$log.log(response.message);
				}
			},
			function (error) {
				$log.log(error);
			}
		);
	};

	// Get the first page of a user's drops
	$scope.getDrops();
}