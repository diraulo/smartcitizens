//ideally, the entities Object should be added by the middleware so that it is available during the request processing
//through the req.entities;
var emailerUtility = require('../utils/emailer.js');
var entities = require('../models/modelentities');
var MeterReading = entities.MeterReading;

/*POST Meter reading*/
exports.add = function(req, meterReadingsCallback) {
  console.log("Adding Meter Readings For Account ", req.body.accountNumber);
  // Get our form values. These rely on the "name" attributes   
  var meterreadingsData = {
    "account" : req.body.accountNumber,
    "bp" : req.body.bp,
    "date" : req.body.readingDate,
    "portion" : req.body.portion,
    "electricity" : req.body.electricity,
    "water" : req.body.water,
    "electricityimage": req.body.electricityimg,
    "waterimage": req.body.waterimg
  };
  
  var meterReadings = new MeterReading(meterreadingsData);
  //try to save in to the DB
  meterReadings.save(function (err) {
		if(!err){
			console.log("All went well. Property Successfully saved meter readings for Smart Citizen. ", meterReadings); 
			meterReadingsCallback (null, meterReadings);
		}
		else{
			meterReadingsCallback (err);
		}
	});    
};

/*
	Return a list of available meter readings (this should be available only for admin users in practice) 
*/
exports.list = function (callback){
  MeterReading.find(function (err, meterReadings){
    callback(err, meterReadings);
  });
};
/*
  Method to return the list of Meter Readings for the provided accunt number
  TODO: use the filder object which can have date-range
*/
exports.getMeterReadingForAccount = function (accountNumber, callback){
  MeterReading.find({'account': accountNumber}, function (err, meterReadings){
    callback(err, meterReadings);
  });
};
/*
  Return a Meter Reading identified with the provided Id.
*/
exports.getMeterReadingById = function (id, callback){
  MeterReading.findById(id, function (err, meterReading){
	console.log ("Got Meter Reading by ID = ",meterReading);
    callback(err, meterReading);
  });
};

/*
	Update the reading. This should really never happen - but we might need this to allow the user to make corrections.
	Only Water Image, Water Reading, Electricity Image, Electricity Reading can be modified
*/
exports.updateMeterReading = function (id, values, callback){

	MeterReading.findById(id, function (err, meterReading) {
		if(!err && meterReading){
		 //perform an upsert operation here
			if(values.water)
				meterReading.water = values.water;
			if(values.electricity)
				meterReading.electricity = values.electricity;
			if(values.waterimage)
				meterReading.waterimage = values.waterimage;
			if(values.electricityimage)
				meterReading.electricityimage = values.electricityimage;
			meterReading.save(function(err){
				callback(err,meterReading);
			});
		}
		else if(err){
		  callback(err);
		}
		else{
		 callback (new Error ("Could Not Find Meter Reading to Update"));
		}
    });

};

/*
  Delete Meter Reading - This is an admin action.
*/
exports.deleteMeterReading = function (id, callback){
	console.log("deleteMeterReading. Id = ", id);
	MeterReading.findById(id, function (err, meterReading) {
		if(!err && meterReading){
			meterReading.remove(function(err){
				callback(err);
			});
		}
		else if(err){
		  callback(err);
		}
		else{
		 callback (new Error ("Could Not Find Meter Reading to Delete"));
		}
    });
};

/*
	Helper method that finds the meter-reading by Id and then email it.
*/
exports.findAndEmailReadings = function (readingsId, associatedProperty, callback){
	MeterReading.findById(id, function (err, meterReading) {
		if(!err && meterReading){
			var data = meterReading;
			data.surname = associatedProperty.surname;
			data.physicaladdress = associatedProperty.physicaladdress;
			data.initials = associatedProperty.initials;
			submitReadingByEmail(meterReading._id, data, callback);	
		}
		else if(err){
		  callback(err);
		}
		else{
		 callback (new Error ("Could Not Find Meter Reading to Delete"));
		}
    });
};

/*
	API method for sending the meter readings by email.
*/
exports.emailReadings = function(readingsId, readingsData,callback){
   submitReadingByEmail(readingsId, readingsData, callback)
}
/*
  Helper method to email the readings to the City of Tshwane 
*/
function submitReadingByEmail(id, data, callback){
  if(!data){ callback(new Error("No Data Supplied- Cannot Send Email.")); return; }
  console.log("submitReadingByEmail:: Abount to Email The Readings Data ", data);
  var subject = emailerUtility.DEFAULT_SUBJECT_PREFIX+data.accNum;
  var body = emailerUtility.DEFAULT_EMAIL_BODY;
  //the server-generated IDs are UUID and have dashes which, to create a file name, might need to be changed to underscores.
  var idSeparator = new RegExp("-", 'g');  
  var serverGeneratedReadingsId =id.replace(idSeparator,"_"); 
  emailerUtility.sendMailToCity(data,subject ,body, function(success){
		//here perhaps we need to record in our DBs that we have successfully posted the readings
	   console.log("Email sent: ",success);
	   if(success){
	    //delete the file that was attached - we can always generate this should we needed (which should not happen - but perhaps for reporting later on)
		markAsEmailed(id);
	   }
	   callback(success);
	}, serverGeneratedReadingsId); 
}

/*
   A helper method that simply set the emailed-property of a meter-reading model to True to indicate that it has been emailed.
*/
function markAsEmailed(readingId){
 MeterReading.findById(id, function (err, meterReading) {
		if(!err && meterReading){
		 //set emailed to TURE	
			meterReading.emailed = true;		 
			meterReading.save(function(err){
				console.log("Set the Meter Reading as Emailed. Look -> ", meterReading);
			});
		}
		else{
		 console.log("Could Not Find Meter Reading to Mark as Emailed. Error is ", err);
		}
    });
}
