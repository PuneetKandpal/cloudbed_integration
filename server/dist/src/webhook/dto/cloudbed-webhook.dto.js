"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestWebhookDto = exports.ReservationAccommodationChangedDto = exports.ReservationAccommodationStatusDto = exports.ReservationStatusChangedDto = exports.ReservationWebhookDto = exports.CloudbedWebhookDto = exports.ActorDto = exports.SubReservationDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class SubReservationDto {
    id;
    roomId;
}
exports.SubReservationDto = SubReservationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubReservationDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubReservationDto.prototype, "roomId", void 0);
class ActorDto {
    type;
    id;
}
exports.ActorDto = ActorDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActorDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ActorDto.prototype, "id", void 0);
class CloudbedWebhookDto {
    event;
    version;
    timestamp;
    propertyID_str;
    propertyID;
}
exports.CloudbedWebhookDto = CloudbedWebhookDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CloudbedWebhookDto.prototype, "event", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CloudbedWebhookDto.prototype, "version", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CloudbedWebhookDto.prototype, "timestamp", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CloudbedWebhookDto.prototype, "propertyID_str", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CloudbedWebhookDto.prototype, "propertyID", void 0);
class ReservationWebhookDto extends CloudbedWebhookDto {
    reservationID;
    startDate;
    endDate;
    subReservations;
}
exports.ReservationWebhookDto = ReservationWebhookDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationWebhookDto.prototype, "reservationID", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationWebhookDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationWebhookDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SubReservationDto),
    __metadata("design:type", Array)
], ReservationWebhookDto.prototype, "subReservations", void 0);
class ReservationStatusChangedDto extends CloudbedWebhookDto {
    reservationID;
    status;
    previousStatus;
    actor;
    subReservations;
}
exports.ReservationStatusChangedDto = ReservationStatusChangedDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationStatusChangedDto.prototype, "reservationID", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationStatusChangedDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationStatusChangedDto.prototype, "previousStatus", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ActorDto),
    __metadata("design:type", ActorDto)
], ReservationStatusChangedDto.prototype, "actor", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SubReservationDto),
    __metadata("design:type", Array)
], ReservationStatusChangedDto.prototype, "subReservations", void 0);
class ReservationAccommodationStatusDto extends CloudbedWebhookDto {
    reservationId;
    status;
    roomId;
}
exports.ReservationAccommodationStatusDto = ReservationAccommodationStatusDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationAccommodationStatusDto.prototype, "reservationId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationAccommodationStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationAccommodationStatusDto.prototype, "roomId", void 0);
class ReservationAccommodationChangedDto extends CloudbedWebhookDto {
    reservationId;
    subReservationId;
    roomId;
    roomIdPrev;
}
exports.ReservationAccommodationChangedDto = ReservationAccommodationChangedDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationAccommodationChangedDto.prototype, "reservationId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationAccommodationChangedDto.prototype, "subReservationId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationAccommodationChangedDto.prototype, "roomId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReservationAccommodationChangedDto.prototype, "roomIdPrev", void 0);
class GuestWebhookDto extends CloudbedWebhookDto {
    guestId_str;
    guestId;
}
exports.GuestWebhookDto = GuestWebhookDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GuestWebhookDto.prototype, "guestId_str", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GuestWebhookDto.prototype, "guestId", void 0);
//# sourceMappingURL=cloudbed-webhook.dto.js.map