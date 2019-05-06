exports.error = function(req, res, statusCode, message, err) {
    console.log(req.app.get('env'));
    if(req.app.get('env') === 'development') {
        res
            .status(statusCode || 500)
            .json({
                message: message || err.message,
                error: err || {}
            });
    } else {
        res
        .status(statusCode || 500)
        .json({
            message: message || err.message,
            error: {}
        });
    }
}

exports.replaceId = function(entity) {
    if(entity) {
        entity.id = entity._id;
        delete (entity._id);
    }
    return entity;
}

exports.currentDateAndTime = function() {
    var currentdate = new Date(); 
    var datetime = currentdate.getDate() + "/"
            + (currentdate.getMonth()+1)  + "/" 
            + currentdate.getFullYear() + " "  
            + currentdate.getHours() + ":"  
            + currentdate.getMinutes() + ":" 
            + currentdate.getSeconds();
    return datetime;
}