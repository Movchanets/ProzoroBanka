using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Receipts.DTOs;

namespace ProzoroBanka.Application.Receipts.Commands.AddReceiptItemPhotos;

public record ReceiptUploadFile(
    Stream FileStream,
    string FileName,
    string ContentType);

public record AddReceiptItemPhotosCommand(
    Guid CallerDomainUserId,
    Guid ReceiptId,
    IReadOnlyList<ReceiptUploadFile> Files) : IRequest<ServiceResponse<ReceiptPipelineDto>>;
