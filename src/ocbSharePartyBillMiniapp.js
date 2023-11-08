angular.module('ocb-share-party-bill', [

    'ocb-shared'

]).config(function(menuServiceProvider, translationsLoaderProvider, $urlRouterProvider, miniappServiceProvider, pathServiceProvider, stateServiceProvider,CUSTOMER,PRIVILEGES_FUNCTIONALITY,privilegesServiceProvider) {
    'use strict';

    function registerModule() {
        webComponentRegistry['ocb-share-party-bill'].simpleName = "party_bill";
        webComponentRegistry['ocb-share-party-bill'].startState = "party_bill.content";
    }

    function registerComponents() {
        miniappServiceProvider.registerWidget("ocb-share-party-bill");
        translationsLoaderProvider.addTranslationsPath(pathServiceProvider.generateRootPath("ocb-share-party-bill") + "/i18n/messages_{{language}}.json");
    }

    function registerBaseState() {
        $urlRouterProvider.when('/party_bill', '/party_bill/content');
        stateServiceProvider
            .state('party_bill', {
                url: "/party-bill",
                abstract: true,
                templateUrl: pathServiceProvider.generateTemplatePath("ocb-share-party-bill") + "/layouts/fullscreen/fullscreen_foreign_currencies.html",
                controller: "ForeignCurrenciesViewController",
                data: {
                    analyticsTitle: 'foreigncurrencies.title'
                }
            });
    }

    function registerNavigation() {
        menuServiceProvider.registerMenu({
            id: 'ocb-share-party-bill',
            iconClass: 'foreign-currencies-icon',
            priority: 100,
            baseItem: 'currencies.content',
            showMain: true,
            title: 'party_bill.title',
            items:[
                {
                    id:"party_bill.list_attendee",
                    label: 'party_bill.attendee_list',
                    icon: "ocb-icons ocb_historia",
                    action: "party_bill.list_attendee",
                    priority: 10,
                    silver:'silverStyle'
                },
                {
                id: "party_bill.share_bill",
                label: 'party_bill.label.share_the_bill',
                icon: "ocb-icons ocb_lista_rachunkow",
                action: "party_bill.share_bill",
                priority: 20,
                silver:'silverStyle'
                }

            ]
        });
    }

    var restrictedStatesForSilverPackage = [
        'currencies.share_bill',
        'currencies.list_attendee'
    ];


    function registerRestrictedState() {
        privilegesServiceProvider
            .registerRestrictedState('currencies',"privileges.no_permission.SilverPackage.description")
            .restrictWidget('currencies')
            .restrictionRules
            .add(privilegesServiceProvider.createRestriction.ifFunctionalityEnabled(PRIVILEGES_FUNCTIONALITY.CURRENCIES));

        angular.forEach(restrictedStatesForSilverPackage, function (state) {
            privilegesServiceProvider
                .registerRestrictedState(state,"privileges.no_permission.SilverPackage.description")
                .restrictionRules
                .add(privilegesServiceProvider.createRestriction.hasNotPackageType(CUSTOMER.PACKAGE_TYPE.SILVER));
        });
    }

    registerModule();
    registerComponents();
    registerBaseState();
    registerNavigation();
    registerRestrictedState();

}).run(function (menuService, customerService) {
});