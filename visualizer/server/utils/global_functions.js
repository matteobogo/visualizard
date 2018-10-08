pe = require('parse-error');

/** Handling promises and errors */
to = function(promise) {
    return promise
    .then(data => {
        return [null, data];
    }).catch(err =>
        [pe(err)]
    );
};

/** Throw Error */
TE = function(err_message, log){
    if(log === true){
        console.error(err_message);
    }

    throw new Error(err_message);
};

/** Error Web Response */
ReE = function(res, err, code){
    if(typeof err === 'object' && typeof err.message !== 'undefined'){
        err = err.message;
    }

    if(typeof code !== 'undefined') res.statusCode = code;

    return res.json({success:false, error: err});
};

/** Success Web Response */
ReS = function(res, data, code){
    let send_data = {success:true};

    if(typeof data === 'object'){
        send_data = Object.assign(data, send_data);
    }

    if(typeof code !== 'undefined') res.statusCode = code;

    return res.json(send_data)
};

/** Handling all the uncaught promise rejections */
process.on('unhandledRejection', error => {
    console.error('Uncaught Error', pe(error));
});

getRandomFloat = (min,max) => {

    return Math.random() * (max - min) + min;
};

exports.checkParam = p => { throw new Error(`Missing parameter: ${p}`) };