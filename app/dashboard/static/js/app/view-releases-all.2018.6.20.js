/*! Kernel CI Dashboard | Licensed under the GNU GPL v3 (or later) */
require([
    'jquery',
    'utils/init',
    'utils/format',
    'utils/html',
    'utils/error',
    'utils/request',
    'utils/const',
    'utils/table',
    'tables/release'
], function($, init, format, html, error, request, appconst, table, ttest) {
    'use strict';
    var gDateRange;
    var gBoard;
    var gPageLen;
    var gSearchFilter;
    var gJobsTable;
    var gTableCount;
    var gBatchCountMissing;
	
	var gTableBuild;
	console.log('testing');
    document.getElementById('li-release').setAttribute('class', 'active');

    gDateRange = appconst.MAX_DATE_RANGE;
    gPageLen = null;
    gSearchFilter = null;
    gTableCount = {};
    gBatchCountMissing = {};

	function _createOp( batchOps , result) {
		//console.log(result)
		var suiteId = result._id.$oid;
		var suiteBranch = result.git_branch;
		//suiteQuery = 'board=' + gBoard + '&git_branch=' + suiteBranch;
		var suiteQuery = '&git_branch=' + suiteBranch;
		
		var queryStr 
		if (suiteId) {
			queryStr = 'test_suite_id=' + suiteId;
		}

		batchOps.push({
			method: 'GET',
			operation_id: 'suites-count-' + suiteId,
			resource: 'count',
			document: 'test_suite',
			query: suiteQuery
		});
		batchOps.push({
			method: 'GET',
			operation_id: 'cases-total-count-' + suiteId,
			resource: 'count',
			document: 'test_case',
			query: queryStr
		});

		batchOps.push({
			method: 'GET',
			operation_id: 'cases-success-count-' + suiteId,
			resource: 'count',
			document: 'test_case',
			query: queryStr + '&status=PASS'
		});

		batchOps.push({
			method: 'GET',
			operation_id: 'cases-fail-count-' + suiteId,
			resource: 'count',
			document: 'test_case',
			query: queryStr + '&status=FAIL'
		});

		batchOps.push({
			method: 'GET',
			operation_id: 'cases-unknown-count-' + suiteId,
			resource: 'count',
			document: 'test_case',
			query: queryStr + '&status=OFFLINE&status=UNKNOWN&status=SKIP'
		});
	}
	
    function updateOrStageCount(elementId, count) {
        var element;
        element = document.getElementById(elementId);
        // If we do not have the element in the DOM, it means dataTables has
        // yet to add it.
        if (element) {
            html.replaceContent(
                element, document.createTextNode(format.number(count)));

            // Check if the data structure holding the data to update the
            // elements still holds the element.
            if (gBatchCountMissing.hasOwnProperty(elementId)) {
                delete gBatchCountMissing[elementId];
            }
        } else {
            // Store it in a dictionary for later access.
            if (!gBatchCountMissing.hasOwnProperty(elementId)) {
                gBatchCountMissing[elementId] = count;
            }
        }
    }

    /**
     * Function to be bound to the draw event of the table.
     * This is done to update dynamic elements that are not yet available
     * in the DOM due to the derefer rendering of dataTables.
    **/
    function updateCasesCount() {
        Object.keys(gBatchCountMissing).forEach(function(key) {
            updateOrStageCount(key, gBatchCountMissing[key]);
        });
    }

    function getBatchCountFail() {
        html.replaceByClass('count-badge', '&infin;');
    }

    function getBatchCountDone(response) {
        var results;
		
		
		//console.log( response )
		var id       = response.result[1].operation_id.split('cases-total-count-')[1]
		var ctotal   = response.result[1].result[ 0 ].count
		var csuccess = response.result[2].result[ 0 ].count
		
		var percentage = (( csuccess / ctotal * 100 )) + '%'
		
		
		$( '#rate-' + id ).html(percentage)
		
		
        function _parseOperationsResult(result) {
            gTableCount[result.operation_id] =
                parseInt(result.result[0].count, 10);
        }

        function _updateTable(opId) {
            updateOrStageCount(opId, gTableCount[opId]);
        }

        results = response.result;
        if (results.length > 0) {
            // Parse all the results and update a global object with
            // the operation IDs and the count found.
            results.forEach(_parseOperationsResult);
            // Invalidate the cells in column #2 before updating the DOM
            // elements. In this way we have the correct 'filter' values in the
            // global object that we can use to provide the search parameters.
            gJobsTable.invalidateColumn(2);
            // Now update the DOM with the results.
            Object.keys(gTableCount).forEach(_updateTable);

            // Bind a new function to the draw event of the table.
            gJobsTable.addDrawEvent(updateCasesCount);
        }
    }

    function getBatchCount(response) {
        var batchOps;
        var deferred;
        var suiteId;
        var suiteTree;
        var suiteBranch;
        var suiteQuery;
        var queryStr;
        var queryData;
        var results;

        

        function _getTestSuiteDone(resultz) {
            results = resultz.result;

            if (results.length > 0) {
                batchOps = [];
                // Only one result, latest test suite
                _createOp(results[0]);
                deferred = request.post(
                    '/_ajax/batch', JSON.stringify({batch: batchOps}));

                $.when(deferred)
                    .fail(error.error, getBatchCountFail)
                    .done(getBatchCountDone);
            }
        }

       /*  function _getTestSuite(result) {
            // Query parameters to get the latest test suite
            queryData = {
                board: result.board,
                job: result.job,
                git_branch: result.git_branch,
                sort: 'created_on',
                sort_order: '-1',
                limit: '1'
            }

            // Get the latest test suite
            deferred = request.get('/_ajax/test/suite', queryData);
            $.when(deferred)
                .done(_getTestSuiteDone)
                .fail(function() {
                    document.getElementById('suites-count-'+ result.job)
                        .innerHTML ='&infin;';
                    ttest.getCountFail(result.job)
                });
        }

        results = response.result;
        if (results.length > 0) {
            results.forEach(_getTestSuite);
        } */
    }

    function getJobsFail() {
        html.removeElement(document.getElementById('jobs-table-loading'));
        html.replaceContent(
            document.getElementById('jobs-table-div'),
            html.errorDiv('Error loading data.'));
    }

    function getFilterCasesCount(tree) {
        var filter;

        filter = '';
        if (gTableCount.hasOwnProperty('cases-success-count-' + tree)) {
            if (gTableCount['cases-success-count-' + tree]) {
                filter += 'successfulpass';
            }
        }

        if (gTableCount.hasOwnProperty('cases-fail-count-' + tree)) {
            if (gTableCount['cases-fail-count-' + tree]) {
                filter += 'failed';
            }
        }

        return filter;
    }
	
	function buildTable ( results ) {
		
		/**
         * Create the table column title for the tests set and case count.
        **/
        function _testsColumnTitle() {
            var tooltipNode;

            tooltipNode = html.tooltip();
            tooltipNode.setAttribute(
                'title', 'Total/Successful/Failed/Other tests reports');
            tooltipNode.appendChild(
                document.createTextNode('Latest Tests Results'));

            return tooltipNode.outerHTML;
        }
		
		// Internal wrapper to provide the href.
        function _renderCasesCount(a , type , data ) {
			
			var batchOps = []
			_createOp( batchOps , data )
			
			//console.log( batchOps )
			
			var deferred = request.post( '/_ajax/batch', JSON.stringify( { batch: batchOps } ) );
			
			
			
			$.when(deferred)
				.fail(error.error, getBatchCountFail)
				.done(getBatchCountDone);
			
            if (type === 'filter') {
                return getFilterCasesCount(data);
            } else {
                return ttest.renderCasesCount(
                    data._id.$oid, type, 'cases-', '/release/job/' + data.git_branch + '/');
            }
        }

        // Internal wrapper to provide the href.
        function _renderTree(data, type) {
			console.log('>>>_renderTree');
            console.log(data);
            return ttest.renderTree(
                data, type, '/releases/results/' + type + '/job/' + data + '/');
        }

        // Internal wrapper to provide the href.
        function _renderDetails(href, type, data) {
			console.log('>>>_renderDetails');
            console.log(data);
            return ttest.renderDetails(
                '/release/kernel/' + data._id.$oid + '/' , type);
        }
		
		var columns = [
			{
				data: 'build_type',
				title: 'Build Type',
				type: 'string',
				className: 'tree-column',
				/* render: _renderTree */
			},
			{
				data: 'git_branch',
				title: 'Branch',
				type: 'string',
				className: 'branch-column'
			},
			{
				data: 'kernel',
				title: 'Version',
				type: 'string',
				className: 'test-suite-column',
				//render: _renderSuitesCount
			},

			{
				data: 'created_on',
				title: 'Date',
				type: 'date',
				className: 'date-column pull-center',
				render: ttest.renderDate
			},
			{
                data: 'job',
                orderable: false,
                type: 'string',
                title: _testsColumnTitle(),
                className: 'pull-center',
                render: _renderCasesCount
            },
			{
				data: 'job',
				title: 'Rate',
				type: 'string',
				className: 'date-column pull-center',
				render: ttest.renderRate
			},
			{
				data: 'job',
				type: 'string',
				orderable: false,
				searchable: false,
				className: 'select-column pull-center',
				render: _renderDetails //_renderMoreInfo
			}
		];
		
		 gJobsTable
			.data(results)
			.columns(columns)
			.order([3, 'desc'])
			.rowURL('/test/board/' + gBoard + '/job/%(job)s/')
			.rowURLElements(['job'])
			.languageLengthMenu('trees per page')
			.draw()
               

		gJobsTable
			.pageLen(gPageLen)
			.search(gSearchFilter);
	}

    function getJobsDone(response) {
        var results;

        // Internal wrapper to provide the href.
		
        function _renderSuitesCount(data, type) {
            var rendered;

            rendered = null;
            if (type === 'display') {
                rendered = ttest.countBadge({
                    data: data,
                    type: 'default',
                    idStart: 'suites-',
                    extraClasses: ['suites-count-badge']
                });
            } else if (type === 'sort') {
                if (gTableCount.hasOwnProperty('suites-count-' + data)) {
                    rendered = gTableCount['suites-count-' + data];
                } else {
                    rendered = NaN;
                }
            }

            return rendered;
        }
		
		
		results = response.result;
        if (results.length > 0) {			 
			var batchOps = []
			
			var fields = ['kernel' , 'git_branch', 'created_on', 'name', ];
			
			
			results.forEach( function( kernel , i ){
				// console.log(kernel);
				batchOps.push({
					method: 'GET',
					operation_id: 'kernel-' + kernel,
					resource: 'test_suite',//added
					//document: 'test_suite',
					//aggregate: 'kernel',
					query: 'sort=kernel&sort_order=1&field='+ fields.join( '&field=' )+ '&kernel=' + kernel
				});
			})
			
			var deferred = request.post('/_ajax/batch', JSON.stringify({batch: batchOps}));
			$.when(deferred)
				.fail(error.error, getBatchCountFail)
				.done(getDataDone);
			
        } else {
            html.removeElement(document.getElementById('releases-table-loading'));
            html.replaceContent(
                document.getElementById('releases-table-div'),
                html.errorDiv('No data found.'));
        }
    }
	
	function getDataDone( response ){
		
		//console.log( response )
		
		
		response.result = [ response.result[0] ]
		
		/* response.result */
		
		var store = []			
		var stub = function ( items ) {
			var buildTypes = [ 'Release' , 'Commit' , 'Snapshot' , 'buildTypes3' , 'buildTypes4' , 'buildTypes5' , 'buildTypes6' , 'TYTY' ]
			var ii = 0
			
			var current = items[ 0 ]
			current.build_type = buildTypes[ii++]
			
			
			//console.log( items.length )
			
			for( var i = 1 , t = items.length ; i < t ; i++ ) {			
				if ( current.kernel == items[ i ].kernel && current.git_branch == items[ i ].git_branch ) {
					items[ i ].build_type = buildTypes[ii++]
				} else {
					ii = 0
					items[ i ].build_type = buildTypes[ii++]
					current = items[ i ]
				}				
				store.push( items[ i ] )
			}			
		}
		
		response.result.forEach( function ( kernelItems ) {
			stub( kernelItems.result[0].result )
		} )
		
		//console.log( store )
		
		buildTable(store);
		
    }
	
	function getDataFail( result ) {
	
	}

    function getJobs() {
        var deferred;

        deferred = request.get(
			'/_ajax/suite/distinct/kernel',
            {
                aggregate: 'job',
                date_range: gDateRange,
                //field: [
                //    'job', 'git_branch', 'created_on', 'kernel', 'name'
                //],
                //board: gBoard,
                sort: 'created_on',
                sort_order: -1
            }
        );

        $.when(deferred)
            .fail(error.error, getJobsFail)
            .done(getJobsDone, getBatchCount);
    }
	
	function getData(kernel) {
        var deferred;
	
        deferred = request.get(
			'/_ajax/test/suite?kernel=' + kernel,
            {
                aggregate: 'kernel',
                date_range: gDateRange,
                field: [
                    'job', 'git_branch', 'created_on', 'kernel', 'name'
                ],
                sort: 'created_on',
                sort_order: -1
            }
        );
		return deferred;
    }

    if (document.getElementById('date-range') !== null) {
        gDateRange = document.getElementById('date-range').value;
    }
    if (document.getElementById('board') !== null) {
        gBoard = document.getElementById('board').value;
    }
    if (document.getElementById('page-len') !== null) {
        gPageLen = document.getElementById('page-len').value;
    }
    if (document.getElementById('search-filter') !== null) {
        gSearchFilter = document.getElementById('search-filter').value;
    }
	//console.log('0')
		gJobsTable = table({
			tableId: 'releases-table',
			tableDivId: 'releases-table-div',
			tableLoadingDivId: 'releases-table-loading'
		});	

        getJobs();

    init.hotkeys();
    init.tooltip();
});
