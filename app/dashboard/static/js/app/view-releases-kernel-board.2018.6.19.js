/*!
 * kernelci dashboard.
 * 
 * Copyright (C) 2014, 2015, 2016, 2017  Linaro Ltd.
 * Copyright (c) 2017 BayLibre, SAS.
 * Author: Loys Ollivier <lollivier@baylibre.com>
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
require([
    'jquery',
    'utils/init',
    'utils/router',
    'utils/format',
    'utils/error',
    'utils/request',
    'utils/table',
    'utils/html',
    'utils/const',
    'tables/release'
], function(
    $,
    init, router, format, error, request, table, html, appconst, trelease) {
    'use strict';

    var page = 'release';

    var [ gDateRange , gSearchFilter , gPageLen ] = init.init( page );

    setTimeout(getData, 10);

    // --------------------------------------------------------------------------

    // Parsing of parameters to url
    let params = ( new router( ) )
        .addRoute( page , page + '/$p' , { kernel : '[a-zA-Z0-9_]+' , board : '[a-zA-Z0-9_]+' } )
        .parse( )
    ;
    console.log( 'Params in URL ' , params )

    // --------------------------------------------------------------------------

    var gTable = table({
        tableId           : page + '-table',
        tableDivId        : 'table-div',
        tableLoadingDivId : 'table-loading'
    }).order              ([0, 'asc'])
        .languageLengthMenu ('Cases per page')
        .rowURL             ( '/'+ page + '/kernel/'+ params.kernel +'/board/'+ params.board )
        .rowURLElements     (['kernel' , 'board'])

    // --------------------------------------------------------------------------

    function enableSearch() {
        gTable
            .pageLen(gPageLen)
            .search(gSearchFilter);
    }

    function initColumns()
    {
        return [
            {
                data   : 'test_suite_name',
                title  : 'Test Suite',
                type   : 'string',
            } ,
            // {
            //     data   : 'test_set_name',
            //     title  : 'Test Set',
            //     type   : 'string',
            // } ,
            {
                data   : 'name',
                title  : 'Test Case',
                type   : 'string',
            } ,
            {
                data   : 'status',
                title  : 'Status',
                type   : 'string',
            },
            {
                data   : '_id',
                title  : 'Measured',
                type   : 'float',
                render : trelease.renderMeasurement ,
                defaultContent : ''
            } ,
            {
                data   : '_id',
                title  : 'Units',
                type   : 'string',
                render : trelease.renderUnit ,
                defaultContent : ''
            }
        ];
    }

    // --------------------------------------------------------------------------

    /**
     */
    function getData( ) {

        let params  = {
            //sort: 'created_on',
            //sort_order: -1,
            // date_range: gDateRange,
            date_range: 185,
            //limit: appconst.MAX_QUERY_LIMIT,
            //kernel: 'AGL-fake-version',
            // id: '59c4d64a49d4f1cac41290e3',
        };

        // For do only one request
        request.api(
            '/tests/cases/' ,
            params ,
            getDataParse ,
            table.loadingError
        )

        // For do many request at the same time
        // var batchOps = [];
        // batchOps.push({
        //     method    : 'GET',
        //     document  : 'test_suite',
        //     query     : $.param( params )
        // });
        // request.batch( batchOps , getDataParse , table.loadingError )
    }

    /**
     * @param response
     */
    function getDataParse(response) {

        var results;

        // Internal filter function to check valid test values.
        function _isValid(data) {
            if (data && data !== null && data !== undefined) {
                return true;
            }
            return false;
        }

        results = response.result;
        if (results) {
            results = results.filter(_isValid);
        }

        setTimeout(getDataDone.bind(null, results), 25);
        setTimeout(enableSearch, 25);
    }

    /**
     * @param response
     */
    function getDataDone(response) {

        if ( response.length === 0 )
            return table.loadingError( )
        else
            gTable
                .data   ( response )
                .columns( initColumns( ) )
        gTable
            .draw()
        ;
    }
});
