using System.Diagnostics;
using Kociemba;
using Rubiksolver.Models;

namespace Rubiksolver.Services;

public class CubeSolver
{
    private static bool _tablesInitialized = false;
    private static readonly object _initLock = new();

    public SolveResponse Solve(CubeState state)
    {
        var sw = Stopwatch.StartNew();
        var response = new SolveResponse();

        try
        {
            // Validate the cube state first and provide detailed error messages
            var validationResult = state.ValidateState();
            if (validationResult != null)
            {
                response.Error = $"Invalid cube: {validationResult.GetDetailedMessage()}";
                response.SolveTimeMs = sw.ElapsedMilliseconds;
                return response;
            }

            // Convert our state to Kociemba format
            var kociembaString = state.ToKociembaString();

            // Check if already solved
            if (kociembaString == "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB")
            {
                response.Solution = new List<string>();
                response.MoveCount = 0;
                response.SolveTimeMs = sw.ElapsedMilliseconds;
                return response;
            }

            // Use Kociemba solver (SearchRunTime builds tables at runtime)
            string info;
            string solutionString = SearchRunTime.solution(
                kociembaString,
                out info,
                maxDepth: 22,
                timeOut: 10000,  // 10 second timeout
                useSeparator: false,
                buildTables: false  // Don't save tables to disk
            );

            // Check for errors
            if (solutionString.StartsWith("Error"))
            {
                response.Error = GetErrorMessage(solutionString);
                response.SolveTimeMs = sw.ElapsedMilliseconds;
                return response;
            }

            // Parse solution string into moves
            // Kociemba returns moves like "U R2 F' D" etc.
            var moves = ParseSolution(solutionString);

            response.Solution = moves;
            response.MoveCount = moves.Count;
            response.SolveTimeMs = sw.ElapsedMilliseconds;
        }
        catch (Exception ex)
        {
            response.Error = ex.Message;
            response.SolveTimeMs = sw.ElapsedMilliseconds;
        }

        return response;
    }

    private List<string> ParseSolution(string solutionString)
    {
        if (string.IsNullOrWhiteSpace(solutionString))
            return new List<string>();

        // Kociemba returns moves separated by spaces like "U R2 F' D2 L' B"
        var moves = solutionString
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(m => m.Trim())
            .Where(m => !string.IsNullOrEmpty(m))
            .ToList();

        return moves;
    }

    private string GetErrorMessage(string errorCode)
    {
        return errorCode switch
        {
            "Error 1" => "Invalid cube: Not exactly one facelet of each color",
            "Error 2" => "Invalid cube: Not all 12 edges exist exactly once",
            "Error 3" => "Invalid cube: One edge has to be flipped",
            "Error 4" => "Invalid cube: Not all 8 corners exist exactly once",
            "Error 5" => "Invalid cube: One corner has to be twisted",
            "Error 6" => "Invalid cube: Two corners or two edges have to be exchanged (parity error)",
            "Error 7" => "No solution found within max depth",
            "Error 8" => "Timeout - no solution found within time limit",
            _ => errorCode
        };
    }
}
