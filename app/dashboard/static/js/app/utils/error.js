/*!
 * kernelci dashboard.
 * 
 * Copyright (C) 2014, 2015, 2016, 2017  Linaro Ltd.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
define([
    'jquery',
    'bootstrap'
], function($) {
    'use strict';
    var err;

    err = {};

    // Create random ID value for the error notification.
    function randId(code) {
        return 'error-' + (Math.random() * ((code + 100) - code) + code);
    }

    function createErrorDiv(code, response) {
        var buttonNode,
            divNode;

        divNode = document.createElement('div');
        divNode.id = randId(code);
        divNode.className = 'alert alert-danger alert-dismissable';

        buttonNode = document.createElement('button');
        buttonNode.className = 'close';
        buttonNode.setAttribute('type', 'button');
        buttonNode.setAttribute('data-dismiss', 'alert');
        buttonNode.setAttribute('aria-hidden', 'true');
        buttonNode.insertAdjacentHTML('beforeend', '&times;');

        divNode.appendChild(buttonNode);

        if ($.isPlainObject( response ) && response.reason ) {
            divNode.insertAdjacentHTML('beforeend', 'Error [ '+ code +' ] : '+ response.reason);
        } else if (response !== '' && response !== undefined && response !== null) {
            divNode.insertAdjacentHTML('beforeend', response);
        } else {
            divNode.appendChild(
                document.createTextNode(
                    'Error while loading data from the server ' +
                    '(error code: ' + code + ').')
            );
            divNode.appendChild(document.createTextNode(' '));
            divNode.appendChild(
                document.createTextNode(
                    'Please contact the website administrator'));
        }

        return divNode;
    }

    function createError(code , response ) {
        var divNode,
            errorElement;

        errorElement = document.getElementById('errors-container');
        divNode = createErrorDiv(code , response );
        errorElement.appendChild(divNode);

        $('#' + divNode.id).alert();
    }

    err.error = function(response) {
        createError(response.status , response.responseJSON );
    };

    err.customError = function(code, message) {
        var divNode,
            errorElement;

        errorElement = document.getElementById('errors-container');
        divNode = createErrorDiv(code, { code : code , reason : message } );
        errorElement.appendChild(divNode);

        $('#' + divNode.id).alert();
    };

    return err;
});
