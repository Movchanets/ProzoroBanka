using Microsoft.AspNetCore.Mvc;

namespace ProzoroBanka.API.Controllers;

/// <summary>
/// Базовий контролер API — задає префікс маршруту та формат відповідей.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
}
