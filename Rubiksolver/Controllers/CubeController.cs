using Microsoft.AspNetCore.Mvc;
using Rubiksolver.Models;
using Rubiksolver.Services;

namespace Rubiksolver.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CubeController : ControllerBase
{
    private readonly CubeSolver _solver = new();

    [HttpPost("solve")]
    public ActionResult<SolveResponse> Solve([FromBody] SolveRequest request)
    {
        if (request.State == null)
        {
            return BadRequest(new SolveResponse { Error = "State is required" });
        }

        var response = _solver.Solve(request.State);
        return Ok(response);
    }
}
