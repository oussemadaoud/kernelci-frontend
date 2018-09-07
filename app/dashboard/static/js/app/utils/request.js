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
    'jquery' ,
    'utils/error',
], function($ , error ) {
    'use strict';
    var request,
        settings;

    request = {};
    settings = {
        traditional: true,
        cache: true,
        dataType: 'json',
        timeout: 35000,
        beforeSend: function(jqXHR) {
            jqXHR.setRequestHeader('X-CSRFToken', _getToken());
        }
    };

    function _getToken() {
        var token;

        token = null;
        if (document.querySelector('meta[name=csrf-token]') !== null) {
            token = document.querySelector('meta[name=csrf-token]').content;
        }
        return token;
    }

    function _makeRequest(method, url, data) {
        settings.headers = {'Content-Type': 'application/json'};
        settings.type = method;

        if (!data) {
            data = {};
        }
        settings.data = data;

        return $.ajax(url, settings);
    }

    /**
     * @param {{}[]}      batchOps
     * @param {Function}  success
     * @param {Function}  fail
     */
    request.batch = function( batchOps , success , fail ) {
        this.backend( 'post' , 'batch' , JSON.stringify( { batch: batchOps } ) , success , fail )
    }

    /**
     * @param {{}[]}      batchOps
     * @param {Function}  success
     * @param {Function}  fail
     */
    request.api = function( api , params , success , fail ) {
        this.backend( 'get' , api , $.param( params ) , success , fail )
    }

    /**
     * @param {"get"|"post"}  method
     * @param {string}    api
     * @param {string}    params
     * @param {Function}  success
     * @param {Function}  fail
     */
    request.backend = function( method ,  api , params , success , fail ) {
        var deferred = request[ method ]( '/_backend/'+ api , params );
        $.when(deferred)
            .fail( error.error,  fail )
            .done( success );
    }

    request.get = function(url, data) {
        return _makeRequest('GET', url, data);
    };

    request.post = function(url, data) {
        return _makeRequest('POST', url, data);
    };

    return request;
});
