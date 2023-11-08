angular.module('ocb-share-party-bill')
    .constant("TRANSFER_TYPES_ALLOWED_FOR_REPEAT", ['LOCAL_DEBIT_TRANSFER', 'LOCAL_CREDIT_TRANSFER', 'OWN_DEBIT_TRANSFER', 'OWN_CREDIT_TRANSFER'])
    .constant("TRANSFER_TYPES_ALLOWED_FOR_RECIPIENT_SAVING", {
        'LOCAL_DEBIT_TRANSFER': "DOMESTIC",
        'LOCAL_CREDIT_TRANSFER': "DOMESTIC",
        'FOREIGN_CREDIT_TRANSFER': 'FOREIGN',
        'FOREIGN_DEBIT_TRANSFER': 'FOREIGN'
    })
    .config(function (pathServiceProvider, stateServiceProvider) {
        stateServiceProvider.state('party_bill.list_attendee', {
            url: "/list-attendee",
            templateUrl: pathServiceProvider.generateTemplatePath("ocb-share-party-bill") + "/modules/list_attendee/list_attendee.html",
            controller: "ListAttendeeController",
            params: {
                accountId : null,
                operationType: null,
                periodType: null,
                startDate: null,
                showDetails: false
            },
            resolve: {
                CURRENT_DATE: ['utilityService', function(utilityService){
                    return utilityService.getCurrentDateWithTimezone();
                }]
            },
            data: {
                analyticsTitle: 'account.submenu.options.history.header'
            }
        });
    })
    .controller('ListAttendeeController', function ($state, lodash, $timeout, accountsService, $stateParams, viewStateService, $scope, translate,
                                                            bdTableConfig, $q, dateFilter, transactionFilterCriteria, exportService, customerService,
                                                            dateParser, downloadService, TRANSFER_TYPES_ALLOWED_FOR_REPEAT,
                                                            TRANSFER_TYPES_ALLOWED_FOR_RECIPIENT_SAVING,validationsService, $filter,CURRENT_DATE, utilityService,
                                                            paymentsService, foreignCurrenciesService) {

        $scope.currentDate = CURRENT_DATE.time;

        $scope.searchModel = {
            period:{
                type: 'last',
                last:{
                    type: 'days'
                },
                specific: {
                    from: null,
                    to: null
                },
                current: {
                    from: null,
                    to: null
                }
            },
            advancedSearch: {
                advancedSearchExpanded: false
            },
            periodSpecific: null,
            operationType: null
        };

        $scope.showTable = true;
        $scope.transactionSummaryPromise = null;
        $scope.transactionList = [];
        $scope.filterParams = {};
        $scope.models = {
            query : transactionFilterCriteria.getTransactionFilterInitValues(),
            sent : transactionFilterCriteria.getTransactionFilterInitViewValues($scope.currentDate),
            view : transactionFilterCriteria.getTransactionFilterInitViewValues($scope.currentDate)
        };

        $scope.transactionType = false;

        var postInit = function($promise, $params) { //search data incliuded
            var showDetails = false;
                if($scope.table.newSearch){
                    $scope.table.newSearch = false;
                    $scope.table.tableConfig.currentPage = 1;
                    $scope.table.tableConfig.pageCount = 1;
                }
                $timeout(function () {
                    if($scope.searchModel.getFormController().$invalid) {
                        $scope.showSummary = false;
                        $scope.showTable = false;
                        $promise.resolve([]);
                    } else {
                        $scope.showSummary = false;
                        $scope.showTable = true;
                        var query = angular.copy($scope.models.query);

                        if($stateParams.operationType){
                            $scope.searchModel.operationType = lodash.find($scope.transactionFilterCriteria.getPossibleTransactionTypes(), {
                                value: $stateParams.operationType
                            });

                            if($stateParams.showDetails){
                                showDetails = true;
                            }
                        }

                        callAPI($params);

                        $scope.table.promise = $scope.transactionList;
                        $promise.resolve($scope.transactionList);
                    }
                }, 10);
        };

        function callAPI($params){
            var param = {
                accountId : null,
                paymentType : $scope.table.tableConfig.selectedTransactionType.id,
                dateFrom : dateFilter(dateParser.parse($scope.table.tableConfig.dateRange.dateFrom, 'dd.MM.yyyy'), 'yyyy-MM-dd'),
                dateTo : dateFilter(dateParser.parse($scope.table.tableConfig.dateRange.dateTo, 'dd.MM.yyyy'), 'yyyy-MM-dd'),
                currency : $scope.table.tableConfig.selectedCurrency,
                pageSize : 10,
                pageNumber : $params.currentPage
            }
            var formatter = new Intl.NumberFormat('en-US');
            $scope.transactionList = foreignCurrenciesService.searchOperationHistory(param)
                .then(function (data) {
                    var list = data.data;
                    var $translate = $filter('translate');
                    var index = 0;
                    lodash.forEach(list, function (transaction) {
                        lodash.assign(transaction, {
                            transactionDate: transaction.realizationDate,
                            transactionCode : transaction.t24TransNo,
                            sellingAmount : formatter.format(transaction.amount),
                            currency : transaction.currency,
                            rate : formatter.format(transaction.exRateValue),
                            receivedMoney : formatter.format(transaction.exchangedAmount),
                            receivedAccount : transaction.creditAccount,
                            transactionStatus: transaction.operationStatus == "EXECUTED" ? $translate('foreigncurrencies.label.transaction.success') : $translate('foreigncurrencies.label.transaction.notSuccess')
                        });
                        index++;
                    });

                    $params.pageCount = data.totalPages;
                    if(list) $scope.showSummary = list.length > 0;
                    if($scope.showSummary){
                        $scope.queryModel = angular.extend($scope.searchModel);
                    }
                    if(list) $scope.showTable = list.length > 0;
                    if (list.pageNumber === 1) {
                        resolveTransactionSummary(data.summary);
                    }
                    return list;
                }).catch(function(){
                    $scope.showSummary = false;
                    $scope.showTable = false;
                    $params.pageCount = 0;
                    return [];
                });
        }

        $scope.searchData = function ($params) {
            // callAPI($params);
            $scope.table.tableControl.invalidate();
        }

        var preInit = function($promise, $params) {
            //Loại giao dịch
            $scope.listTransactionTypeSearch = [];
            var $translate = $filter('translate');
            var tempItem ={
                key : $translate('foreigncurrencies.label.transaction.sellingCurrencyNow'),
                id:"ForeignCurrencyPayment"
            };
            $scope.listTransactionTypeSearch.push(tempItem);
            $scope.table.tableConfig.selectedTransactionType = $scope.listTransactionTypeSearch[0];

            //Đồng tiền giao dịch
            foreignCurrenciesService.search().then(function(data) {
                $scope.listCurrency = [];
                for(var i = 0 ; i<data.length;i++){
                    $scope.listCurrency.push(data[i].currency);
                }
                $scope.table.tableConfig.selectedCurrency = $scope.listCurrency[0];
            });
            var now = new Date();
            var oneDayMilisecs = 1000 * 60 * 60 * 24;
            $scope.table.tableConfig.dateRange.dateFrom = new Date(now.getTime() - (30 * oneDayMilisecs));
            $scope.table.tableConfig.dateRange.dateTo = new Date(now.getTime());
            $params.currentPage = 1;
            postInit($promise, $params);
        };

        $scope.transactionData = function ($promise, $params) {
            preInit($promise, $params);
            $scope.table.tableData.getData = postInit;
        };

        $scope.table = {
            tableConfig : new bdTableConfig({
                placeholderText: translate.property("account.transactions.list.empty"),
                dateRange : {dateFrom : $scope.models.sent.dateFrom, dateTo : $scope.models.sent.dateTo}
            }),
            tableData : {
                getData: $scope.transactionData
            },
            tableControl: undefined
        };

        $scope.clearFilter = function () {
            $scope.models.view.dateFrom = null;
            this.$control.clearFilter();
            $scope.searchModel.amount.from = null;
            $scope.searchModel.amount.to = null;
            $scope.models.view.amountRange.min = null;
        }

    });