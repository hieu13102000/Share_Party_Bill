    angular.module('ocb-share-party-bill')
    .config(function (pathServiceProvider, stateServiceProvider) {
        stateServiceProvider.state('party_bill.share_bill', {
            url: "/share-bill",
            templateUrl: pathServiceProvider.generateTemplatePath("ocb-share-party-bill") + "/modules/invoice/shareTheBill.html",
            controller: "SharedBillController",
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
    .controller('SharedBillController', function ($scope,) {

    });