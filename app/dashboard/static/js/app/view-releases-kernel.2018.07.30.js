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

    var page = 'test-build';

    var [ gDateRange , gSearchFilter , gPageLen ] = init.init( page );

    setTimeout(getData, 1);

    // Parsing of parameters to url
    let params = ( new router( ) )
        .addRoute( page , page + '/$p' , { kernel : '[a-zA-Z0-9-_.]+' } )
        .parse( )
    ;
    // --------------------------------------------------------------------------
    //console.log( 'Params in URL ' , params )
	var kernelVersion=params.kernel;
    var gTable = table({
        tableId           : 'release-table',
        tableDivId        : 'table-div',
        tableLoadingDivId : 'table-loading'
    }).order              ([0, 'asc'])
      .languageLengthMenu ('boards per page')
      //.rowURL             ('/test-build/kernel/'+ params.kernel +'/board/%(board)s/')
      .rowURLElements     (['kernel' , 'board'])
      ;
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
	//get List of test_case _id

	// --------------------------------------------------------------------------
    function gotourl(url){
        window.location = url;
    }
    
	function getBatchCountDone(response) {
		console.log(response);
	};
	function _createOp() {
		var batchOps = [];
		batchOps.push({
			method: 'GET',
			operation_id: status,
			resource: 'test_case',
			query: 'field=status'
		}); 
		return batchOps;
	}
	//update data
	function updateOrStageCount(elementId, count) {
        var element;
        element = document.getElementById(elementId);
        if(element){html.replaceContent(element, document.createTextNode(format.number(count)));}
		else{html.replaceContent(element, document.createTextNode('?'));}
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
	function updateOrStageData(elementId, data) {
        var element;
        element = document.getElementById(elementId);
        if(element){html.replaceContent(element, document.createTextNode(data));}
		else{html.replaceContent(element, document.createTextNode('?'));}
    }
	function setCasesCount(data){
		var batchOps = _createOp();
			var deferred = request.post( '/_backend/batch', JSON.stringify( { batch: batchOps } ) );
				$.when(deferred)
					.fail(function(batch){
						data.forEach(function(element){//board
							element.name.forEach(function(e){//name
								var idCountCases = hash(element.board + e.name);
								gTable.addDrawEvent(updateOrStageData('total-count-'+idCountCases, ''));
								gTable.addDrawEvent(updateOrStageData('success-count-'+idCountCases, ''));
								gTable.addDrawEvent(updateOrStageData('fail-count-'+idCountCases, 'too much data!'));
								gTable.addDrawEvent(updateOrStageData('unknown-count-'+idCountCases, ''));
							});
						});
					})
					.done(function(batch){
						data.forEach(function(element){//board
                            var idRate = hash(element.board);
                            var RpassCount=0;
                            var RfailCount=0;
							var RskipCount=0;
							var RtotalCount=0;
							element.name.forEach(function(e){//name
								var idCountCases = hash(element.board + e.name);
								if(e.test_case.length == 0){
									gTable.addDrawEvent(updateOrStageData('total-count-'+idCountCases, 'No data'));
									gTable.addDrawEvent(updateOrStageData('success-count-'+idCountCases, ''));
									gTable.addDrawEvent(updateOrStageData('fail-count-'+idCountCases, ''));
									gTable.addDrawEvent(updateOrStageData('unknown-count-'+idCountCases, ''));
								}else{
									var passCount=0;
									var failCount=0;
									var skipCount=0;
									var totalCount=0;
									batch.result[0].result[0].result.forEach(function(all){
										e.test_case.forEach(function(caseID){
											if(all._id.$oid==caseID.$oid){
												totalCount++;
												if(all.status=='PASS')
													passCount++;
												if(all.status=='FAIL')
													failCount++;
											}
										});
									});
									skipCount = totalCount - passCount - failCount;
                                    //for rate
                                    RpassCount = RpassCount + passCount;
                                    RfailCount = RfailCount + failCount;
                                    RskipCount = RskipCount + skipCount;
                                    RtotalCount = RtotalCount + totalCount;
                                    var data_original_title = '- More details -<br><table><tr><td>kernel/Version : '+kernelVersion+'</td></tr><!-- --><tr><td>Board : '+element.board+'</td></tr><!-- --><tr><td>Test suite name : '+e.name+'</td></tr></table>';
                                    var data_original_herf = '/test-build/kernel/'+kernelVersion+'/board/'+element.board+'/suite_name/'+e.name+'/';
                                    //gTable.addDrawEvent($( "#total-count-" + idCountCases ).parent().add("span").attr("id","count-details-"+idCountCases));
                                    gTable.addDrawEvent($( "#total-count-"+idCountCases ).parent().html($( "#total-count-" + idCountCases ).parent().html()+'<span rel="tooltip" data-toggle="tooltip" title="" data-original-title="'+data_original_title+'"><a href="'+data_original_herf+'"><i class="fa fa-search"></i></a></span>'));
                                    gTable.addDrawEvent($( "#total-count-"+idCountCases ).parent().attr("onclick","window.location = '"+data_original_herf+"';"));
                                    
									gTable.addDrawEvent(updateOrStageCount('total-count-'+idCountCases, totalCount));
									gTable.addDrawEvent(updateOrStageCount('success-count-'+idCountCases, passCount));
									gTable.addDrawEvent(updateOrStageCount('fail-count-'+idCountCases, failCount));
									gTable.addDrawEvent(updateOrStageCount('unknown-count-'+idCountCases, skipCount));
								}
							});
                            var percentage = (( RpassCount / RtotalCount * 100 ));
                            gTable.addDrawEvent(updateOrStageRate('rate-'+idRate, percentage));
                            if(percentage>=success)
                                gTable.addDrawEvent($('#rate-'+idRate).addClass( "badge alert-success  count-badge extra-margin" ));
                            if(percentage<success && percentage>=warning)
                                gTable.addDrawEvent($('#rate-'+idRate).addClass( "badge alert-warning  count-badge extra-margin" ));
                            if(percentage<warning)
                                gTable.addDrawEvent($('#rate-'+idRate).addClass( "badge alert-danger count-badge extra-margin" ));
                            // row color
                            if(percentage==0){
                                if(RfailCount==0)
                                    gTable.addDrawEvent($('#rate-'+idRate).parent().parent().addClass( " alert-warning" ));
                                else
                                    gTable.addDrawEvent($('#rate-'+idRate).parent().parent().addClass( " alert-danger" ));
                            }
						});
					});
	}
	
	var arg_cout = 1;
	function _renderCasesCount(name, type , data){
        return trelease.renderCasesCount(hash(data.board+name), type, ''/* , 'board/'+data.board+'/suite/name/'+name */);
    }
	// --------------------------------------------------------------------------
	// --------------------------------------------------------------------------
    function enableSearch() {
        gTable
            .pageLen(gPageLen)
            .search(gSearchFilter);
    }
	function initColumns(columns){ 
		var colList = [
			{
				data   : 'board',
				title  : 'Board',
				type   : 'string',
				//render : board //function(){return $('<div id="board-'+ 'name' +'"></div>').html('loading...')[0].outerHTML}
				render : (a, data, type ) => {
					return trelease.renderBoardName('/test-build/kernel/'+ params.kernel +'/board/' + data + '/', data, type);
				}
			},
            {
				data: 'board',
				title: 'Rate',
				type: 'string',
				className: 'date-column pull-center',
				render: trelease.renderRate2
			},
			{
				data       : 'board',
				title      : 'Details',
				type       : 'string',
				searchable : false,
				orderable  : false,
				className  : 'select-column pull-center',
				render     : ( data, type ) => {
					return trelease.renderDetails('/test-build/kernel/'+ params.kernel +'/board/' + data + '/', type, '- More details -<br><table><tr><td>kernel/Version : '+params.kernel+'</td></tr><!-- --><tr><td>Board : '+data+'</td></tr></table>');
				}
			}
		];
		// add the name of test suite
		var ci=0;
		columns.forEach(function(element) {
			colList[ci+3]=colList[ci+2];
			colList[ci+2]=colList[ci+1];
			colList[ci+1]=element;
			ci++;
		});
		return colList;
    }

    // --------------------------------------------------------------------------
    function getDataFail() {
        html.removeElement(document.getElementById('table-loading'));
        html.replaceContent(
            document.getElementById('table-div'),
            html.errorDiv('Error loading data.'));
    }
	// **************************************************************
	// Get the test suit list where kernel="kernel param"
	// **************************************************************
	function getData() {
		var deferred = request.api(
			'test/suite/',
            {
                kernel : kernelVersion
            }, 
			getDataDone, 
			getDataFail
        );
    }  
    /**
     * @param response
    */
	function getDataParse(response) {
        var results;
        // Internal filter function to check valid test values.
        function _isValidBoard(data) {
            if (data && data !== null && data !== undefined) {
                return true;
            }
            return false;
        }

        // Convert a value into an object.
        function _toObject(data) {
            return {board: data};
        }

        results = response.result;
        if (results) {
            results = results.filter(_isValidBoard);
            results = results.map(_toObject);
        }
		//add ttt to alim table
	//var output = [{'board':'b1','tsn_1':'11','tsn_2':'12','tsn_3':'13'},{'board':'b2','tsn_1':'21','tsn_2':'22','tsn_3':'23'}]
		//console.log(output);
		setTimeout(getDataDone.bind(null, response), 25);
        setTimeout(enableSearch, 25);
		//getBoardTestSuite( response );
    }
	// Internal wrapper to provide the href.
        // function _renderCasesCount(data, name, title, type) {
            // return trelease.renderCasesCount(a , type , data);
        // }
    /**
     * @param response
     */
    function getDataDone(response){
		// console.log('response.result.board');
		// console.log(response.result);
        if ( response.length === 0 ) {
            return table.loadingError();
        }
		else {
			//get columns from response.result
			var r=response.result;
				console.log('r');
				console.log(r);
			var output = [];
			var columns = [];
			var TestCaseAdded = [];
			var i = 0;
			function getCase(board, name){
				var caseID = [];
				var i = 0;
				r.forEach(function(element){
					if(element.board == board && element.name == name)
						element.test_case.forEach(function(ca){
							caseID[i] = ca;
							i++;
						});
				});
				return {
						'name' : name,
						test_case : caseID
						}
			}
			function getName(board){
				var c = 0;
				var NameAdded = [];
				var Name = [];
				r.forEach(function(element){
					if(element.board==board){
						if(!NameAdded.includes(element.name)){
							NameAdded[c] = element.name;
							Name.push(getCase(board, element.name));
							c++;
						}
					}
				});
				return Name;
			}
			var NameAdded = [];
			var c = 0;
			r.forEach(function(element){
				if(!NameAdded.includes(element.name)){
					NameAdded[c] = element.name;
					c++;
				}
			});
			var BoardAdded = [];
			var z = 0;
			r.forEach(function(element){
				// Get board (distinct)
				if(!BoardAdded.includes(element.board)){
					BoardAdded[z] = element.board;
					output.push({
						board : element.board,
						name : getName(element.board)
					});
					z++;
				}
			});
			output.forEach(function(element){
				//get name list of this board
				var OutputName = [];
				element.name.forEach(function(e){
					OutputName.push(e.name);
				});
				NameAdded.forEach(function(name){
					if(!OutputName.includes(name)){
						OutputName.push(name);
						element.name.push({
							name : name,
							test_case : []
						});
					}
				});
				
			});
			var c = 0;
			var NameAdded = [];
			r.forEach(function(element){
				if(!NameAdded.includes(element.name)){
					NameAdded[c] = element.name;
					var list = [];
					BoardAdded.forEach(function(b){
						list.push({
							board : b,
							name : element.name
						});
					});
					c++;
				}
			});
			c=0;
			NameAdded.forEach(function(element){
				columns[c] = {
					//name : element,
					data : element,
					title : element,
					type : 'string',
					a : 'href',
					render: _renderCasesCount//('/board', 'display', {'board':'b1', 'name':element})
				}
				c++;
			});
			var store = [];
			output.forEach(function(element){
				var myobject = {'board' : element.board}
				element.name.forEach(function(e){
					myobject[e.name] = e.name;
				});
				store.push(myobject);
			});
			console.log('c');
			console.log(c);
			console.log('output');
			console.log(output);
			console.log('store');
			console.log(store);
            console.log('columns');
			console.log(columns);
            gTable
                .data   ( store )
                .columns( initColumns( columns ) )
                ;

			gTable
				.draw()
				;
			setCasesCount(output);
		}
		/*
		for(var c = 0; c < BoardAdded.length; c++){
			var myobject={"board": BoardAdded[c]};
			for(var z = 0; z < NameAdded.length; z++){
				//setCount(BoardAdded[c], NameAdded[z]);
				
				
			}
			output[c]=myobject;
		} 
		*/
    }
	//console.log(params);
});
