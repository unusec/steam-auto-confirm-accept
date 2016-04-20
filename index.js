/*
                    Steam Auto Confirm/Accept

    Created by:     UnuSec
    Description:    Use this script to auto confirm all your Steam Marketplace listings and to accept all
    incoming trade offers in wich you don't loose any items.
*/

var SteamUser = require('steam-user');
var SteamCommunity = require('steamcommunity');
var SteamTotp = require('steam-totp');
var TradeOfferManager = require('steam-tradeoffer-manager');
var fs = require('fs');

var config = require('./config');
var sharedSecret = config.ss;
var identitySecret = config.is;
var username = config.username;
var password = config.password;

var client = new SteamUser();
var community = new SteamCommunity();
var manager = new TradeOfferManager({
    "pollInterval" : 30000,     // Not less than 10000
    "globalAssetCache": true,
    "steam": client,            
    "domain": "localhost",      // Domain name for Steam API
    "language": "en"
});

var logOnOptions = {};
//Get time offeset from Steam servers and use it on logOn
SteamTotp.getTimeOffset(function(err, offset, latency){
    logOnOptions = {
        "accountName": username,
        "password": password,
        "twoFactorCode": SteamTotp.getAuthCode(sharedSecret, offset)
    };
    console.log("Logging in as: ", username);
    client.logOn(logOnOptions);
});

client.on('loggedOn', function () {
    console.log("Logged in with ID " + client.steamID.getSteamID64());
    // Set user online and start card farming. Modify the appid as needed
    // DOTA2 = 570;
    // CSGO =  730;
    var appid=730;
    client.setPersona(SteamUser.Steam.EPersonaState.Online);
    client.gamesPlayed(appid);
});

client.on('webSession', function (sessionID, cookies) {
    manager.setCookies(cookies, function (err) {
        if (err) {
            console.log(err);
            process.exit(1); // Fatal error since we couldn't get our API key
            return;
        }
        console.log("Using API key: " + manager.apiKey);
    });
    community.setCookies(cookies);
    community.startConfirmationChecker(manager.pollInterval, identitySecret); // Checks and accepts confirmations every 10 seconds
});

manager.on('newOffer', function (offer) {
    console.log("New offer #" + offer.id + " from " + offer.partner.getSteamID64());
    offer.getEscrowDuration(function (err, daysTheirEscrow, daysMyEscrow) {
        var escrow = {
            itemsToReceive: offer.itemsToReceive,
            steamId: offer.partner.getSteamID64(),
            daysTheirEscrow: daysTheirEscrow
        };
        if (offer.itemsToGive === 0 && escrow.daysTheirEscrow === 0) {
            offer.accept(function (err) {
                if (!err) {
                    console.log("Offer accepted! received: ", escrow.itemsToReceive);
                } else {
                    console.log("Unable to accept offer from " + escrow.steamId);
                }
            });
        }
    });
});