"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudbedsModule = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const cloudbeds_webhook_controller_1 = require("../cloudbeds.webhook.controller");
const cloudbeds_service_1 = require("../cloudbeds.service");
const cloudbeds_parser_service_1 = require("../cloudbeds.parser.service");
const cloudbeds_source_detector_service_1 = require("../cloudbeds.source-detector.service");
const cloudbeds_publisher_1 = require("../cloudbeds.publisher");
let CloudbedsModule = class CloudbedsModule {
};
exports.CloudbedsModule = CloudbedsModule;
exports.CloudbedsModule = CloudbedsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            microservices_1.ClientsModule.register([
                {
                    name: 'RABBITMQ_CLIENT',
                    transport: microservices_1.Transport.RMQ,
                    options: {
                        urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
                        queue: 'hostelworld-events',
                        queueOptions: {
                            durable: true,
                        },
                    },
                },
            ]),
        ],
        controllers: [cloudbeds_webhook_controller_1.CloudbedsWebhookController],
        providers: [
            cloudbeds_service_1.CloudbedsService,
            cloudbeds_parser_service_1.CloudbedsParserService,
            cloudbeds_source_detector_service_1.CloudbedsSourceDetectorService,
            cloudbeds_publisher_1.CloudbedsPublisher,
        ],
    })
], CloudbedsModule);
//# sourceMappingURL=cloudbeds.module.js.map