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
    var gPageLen = 100;
    var gSearchFilter;
    var gTableCount;
    var gBatchCountMissing;
	
	var page = 'release';

    var [ gDateRange , gSearchFilter , gPageLen ] = init.init( page );

    if (document.getElementById('board') !== null) {
        gBoard = document.getElementById('board').value;
    }

    var gJobsTable = table({
        tableId: 'releases-table',
        tableDivId: 'releases-table-div',
        tableLoadingDivId: 'table-loading'
    });

    gDateRange = appconst.MAX_DATE_RANGE;
    gPageLen = 100;
    gSearchFilter = null;
    gTableCount = {};
    gBatchCountMissing = {};
    //Rate config
	var warning = 40;
	var success = 85;
	//conver string to int
	var hash = function(s) {
		var a = 1, c = 0, h, o;
		if (s) {
			a = 0;
			for (h = s.length - 1; h >= 0; h--) {
				o = s.charCodeAt(h);
				a = (a<<6&268435455) + o + (o<<14);
				c = a & 266338304;
				a = c!==0?a^c>>21:a;
			}
		}
		return String(a);
	};
	function _createOp(store){
		var batchOps = [];
		store.forEach(function(element){
			batchOps.push({
				method: 'GET',
				operation_id: hash(element.git_branch + element.kernel),
				resource: 'test_suite',
				query: 'git_branch=' + element.git_branch + '&kernel=' + element.kernel
			});
		});
		return batchOps;
	}
	
    function updateOrStageCount(elementId, count) {
        var element;
        element = document.getElementById(elementId);
        // If we do not have the element in the DOM, it means dataTables has
        // yet to add it.
        if(element){
            html.replaceContent(element, document.createTextNode(format.number(count)));
        }else{
            html.replaceContent(element, document.createTextNode('?'));
        }
    }
	function updateOrStageRate(elementId, rate){
        var element;
        element = document.getElementById(elementId);
        if (element) {
            html.replaceContent(element, document.createTextNode(rate.toFixed(2)+'%'));
        } else {
            html.replaceContent(element, document.createTextNode(format.number('?')));
        }
    }
	function updateOrStageData(elementId, data){
        var element;
        element = document.getElementById(elementId);
        if (element) {
            html.replaceContent(element, document.createTextNode(data));
        } else {
            html.replaceContent(element, document.createTextNode('?'));
        }
    }
	function updateOrStageClass(element){
        if (element) {
            html.replaceContent(element, document.createTextNode(data));
        } else {
            html.replaceContent(element, document.createTextNode('?'));
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
		
		var id       = response.result[1].operation_id.split('cases-total-count-')[1]
		var ctotal   = response.result[1].result[ 0 ].count
		var csuccess = response.result[2].result[ 0 ].count
		
		var percentage = (( csuccess / ctotal * 100 ));
		
		$( '#rate-' + id ).html(percentage.toFixed(2) + '%')
		
		
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

    function getJobsFail() {
        html.removeElement(document.getElementById('table-loading'));
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
	function setCasesCount(allCases, data){
		var batchOps = _createOp(data);
		var deferred = request.post( '/_backend/batch', JSON.stringify( { batch: batchOps } ) );
			$.when(deferred)
				.fail(function(batch){
					data.forEach(function(element){// git_branch + kernel
						var idCountCases = hash(element.git_branch + element.kernel);
						gJobsTable.addDrawEvent(updateOrStageData('cases-total-count-'+idCountCases, null));
						gJobsTable.addDrawEvent(updateOrStageData('cases-success-count-'+idCountCases, null));
						gJobsTable.addDrawEvent(updateOrStageData('cases-fail-count-'+idCountCases, null));
						gJobsTable.addDrawEvent(updateOrStageData('cases-unknown-count-'+idCountCases, null));
					});
				})
				.done(function(batch){
					console.log('batch');
					console.log(batch);
					batch.result.forEach(function(element){// git_branch + kernel
						var passCount=0;
						var failCount=0;
						var skipCount=0;
						var totalCount=0;
						allCases.result[0].result[0].result.forEach(function(all){
							element.result[0].result.forEach(function(suite){
								suite.test_case.forEach(function(caseID){								
									if(all._id.$oid==caseID.$oid){
										totalCount++;
										if(all.status=='PASS')
											passCount++;
										if(all.status=='FAIL')
											failCount++;
									}
								});
							});
						});
						var idCountCases = element.operation_id;
						skipCount = totalCount - passCount - failCount;
						//set rate
						updateOrStageCount('cases-total-count-'+idCountCases, totalCount);
						gJobsTable.addDrawEvent(updateOrStageCount('cases-success-count-'+idCountCases, passCount));
						gJobsTable.addDrawEvent(updateOrStageCount('cases-fail-count-'+idCountCases, failCount));
						gJobsTable.addDrawEvent(updateOrStageCount('cases-unknown-count-'+idCountCases, skipCount));
						var percentage = (( passCount / totalCount * 100 ));
						//$('#rate-'+idCountCases).html(percentage.toFixed(2)+'%');
						gJobsTable.addDrawEvent(updateOrStageRate('rate-'+idCountCases, percentage));
						if(percentage>=success)
							gJobsTable.addDrawEvent($('#rate-'+idCountCases).addClass( "badge alert-success  count-badge extra-margin" ));
						if(percentage<success && percentage>=warning)
							gJobsTable.addDrawEvent($('#rate-'+idCountCases).addClass( "badge alert-warning  count-badge extra-margin" ));
						if(percentage<warning)
							gJobsTable.addDrawEvent($('#rate-'+idCountCases).addClass( "badge alert-danger count-badge extra-margin" ));
						// row color
						if(percentage==0){
                            if(failCount==0)
                                gJobsTable.addDrawEvent($('#rate-'+idCountCases).parent().parent().addClass( " alert-warning" ));
                            else
                                gJobsTable.addDrawEvent($('#rate-'+idCountCases).parent().parent().addClass( " alert-danger" ));
						}
					});
				});
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
		// Render Cases Count
        function _renderCasesCount(a , type , data ) {
            return ttest.renderCasesCount(hash(data.git_branch + data.kernel), type, 'cases-', '/test-build/kernel/' + data.kernel + '/');
        }
        // Render Git Url
		function _renderGitUrl(href, type, data) {
			return ttest.renderGitUrl(data.git_url, type, data.git_branch);
        }
		// Render Kernel
        function _renderKernel(href, type, data) {
			return ttest.renderKernelRelease(data.kernel, type, '/test-build/kernel/'+data.kernel+'/');
        }
		// Render Details
        function _renderDetails(href, type, data) {
			return ttest.renderDetails('/test-build/kernel/'+data.kernel+'/', type, 'More info about '+data.kernel+' kernel');
        }
		var columns = [
			{
				data: 'build_type',
				title: 'Build Type',
				type: 'string',
				className: 'tree-column',
			},
			{
				data: 'job',
				title: 'Tree',
				type: 'string',
				className: 'tree-column',
			},
            {
				data: 'git_branch',
				title: 'Branch',
				type: 'string',
				className: 'branch-column',
				render: _renderGitUrl
			},
			{
				data: 'kernel',
				title: 'Version',
				type: 'string',
				className: 'test-suite-column',
				render: _renderKernel
			},
			{
				data: 'created_on',
				title: 'Date',
				type: 'date',
				className: 'date-column pull-center sorting_asc',
				render: ttest.renderDate
			},
			{
                data: 'kernel',
                orderable: false,
                type: 'string',
                title: _testsColumnTitle(),
                className: 'pull-center',
                render: _renderCasesCount
            },
			{
				data: 'kernel',
				title: 'Rate',
				type: 'string',
				className: 'date-column pull-center',
				render: ttest.renderRate
			},
			{
				data: 'kernel',
				type: 'string',
				orderable: false,
				searchable: false,
				className: 'select-column pull-center',
				render: _renderDetails //_renderMoreInfo
			}
		];
		//console.log(results);
		 gJobsTable
			.data(results)
			.columns(columns)
			.order([3, 'desc'])
			//.rowURL('/test-build/kernel/%(kernel)s')
			.rowURLElements(['kernel'])
			.languageLengthMenu('test by build per page')
			.draw()
               

		gJobsTable
			.pageLen(gPageLen)
			.search(gSearchFilter);
			
		var batchOps = [];
		batchOps.push({
			method: 'GET',
			operation_id: status,
			resource: 'test_case',
			query: 'field=status'
		});
		console.log('allCases->batchOps');
		console.log(batchOps);
		var deferred = request.post('/_ajax/batch', JSON.stringify({batch: batchOps}));
			$.when(deferred)
				.fail(error.error, getBatchCountFail)
				.done(function(allCases){
					setCasesCount(allCases, results);
				});
	}
	
    function getJobsDone(response) {
        var results = response.result;
		console.log('getJobsDone -> response');
		console.log(response);
        if (results.length > 0) {			 
			var fields = ['job' , 'kernel' , 'git_branch', 'build_type', 'created_on', 'git_url'];
			var batchOps = [];
			results.forEach(function(kernel){
				batchOps.push({
					method: 'GET',
					operation_id: 'kernel--' + kernel,
					resource: 'test_suite',
					query: 'kernel=' + kernel + '&aggregate=git_branch&field='+ fields.join( '&field=' )
				});
			});
			
			var deferred = request.post('/_ajax/batch', JSON.stringify({batch: batchOps}));
			$.when(deferred)
				.fail(error.error, getBatchCountFail)
				.done(getDataDone);
			
        } else {
            html.removeElement(document.getElementById('table-loading'));
            html.replaceContent(
                document.getElementById('releases-table-div'),
                html.errorDiv('No data found.'));
        }
    }
	
	function getDataDone( response ){
		console.log('getDataDone -> response');
		console.log(response);
		var store = [];
		response.result.forEach(function(kernelItems){
			kernelItems.result.forEach(function(branchItems){
				// if(branchItems.git_url){
					// var _branch = '<front onclick="alert('+branchItems.git_url+');">'+branchItems.git_branch+'</a>';
				// }else
					var _branch = branchItems.git_branch;
				store.push({
                    job: branchItems.job,
					build_type: branchItems.build_type,
					git_branch: _branch,
					git_url: branchItems.git_url,
					kernel: branchItems.kernel,
					created_on: branchItems.created_on
				});
			});
		});
		
        html.removeElement(document.getElementById('table-loading'));
		console.log('store');
		console.log(store);
		buildTable(store);
		
    }
    function getJobs(){
        var deferred = request.get(
			'/_ajax/suite/distinct/kernel',
            {
                aggregate: 'job',
                date_range: gDateRange,
				//limit : 20,
                sort: 'created_on',
                sort_order: -1
            }
        );
        $.when(deferred)
            .fail(error.error, getJobsFail)
            .done(getJobsDone);
    }
    getJobs();
});
