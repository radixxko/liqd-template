'use strict';

module.exports = (
{
    htmlentities: function( value )
    {
        return value.toString().replace(/[&<>"'`\/\\]/g, function( char ){ return '&#' + char.charCodeAt() + ';' });
    }
});
