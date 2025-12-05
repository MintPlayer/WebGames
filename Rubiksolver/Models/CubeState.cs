namespace Rubiksolver.Models;

public class CubeState
{
    // Each face has 9 stickers, indexed 0-8 (top-left to bottom-right when looking at face)
    // Colors: W=White, Y=Yellow, G=Green, B=Blue, R=Red, O=Orange
    // Kociemba uses face names: U=Up, D=Down, F=Front, B=Back, R=Right, L=Left
    public string[] U { get; set; } = new string[9]; // Up (White)
    public string[] D { get; set; } = new string[9]; // Down (Yellow)
    public string[] F { get; set; } = new string[9]; // Front (Green)
    public string[] B { get; set; } = new string[9]; // Back (Blue)
    public string[] R { get; set; } = new string[9]; // Right (Red)
    public string[] L { get; set; } = new string[9]; // Left (Orange)

    public CubeState()
    {
        // Initialize to solved state
        Reset();
    }

    public void Reset()
    {
        Array.Fill(U, "W");
        Array.Fill(D, "Y");
        Array.Fill(F, "G");
        Array.Fill(B, "B");
        Array.Fill(R, "R");
        Array.Fill(L, "O");
    }

    /// <summary>
    /// Convert to Kociemba format string.
    /// Kociemba expects: U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
    /// Each character is the face name (U/R/F/D/L/B) of the color at that position.
    /// </summary>
    public string ToKociembaString()
    {
        // Map colors to Kociemba face names based on the center colors
        // Our colors: W=Up face, R=Right face, G=Front face, Y=Down face, O=Left face, B=Back face
        var colorToFace = new Dictionary<string, char>
        {
            ["W"] = 'U',  // White is Up face
            ["R"] = 'R',  // Red is Right face
            ["G"] = 'F',  // Green is Front face
            ["Y"] = 'D',  // Yellow is Down face
            ["O"] = 'L',  // Orange is Left face
            ["B"] = 'B'   // Blue is Back face
        };

        var sb = new System.Text.StringBuilder(54);

        // Order: U, R, F, D, L, B (each face has 9 stickers)
        foreach (var color in U) sb.Append(colorToFace[color]);
        foreach (var color in R) sb.Append(colorToFace[color]);
        foreach (var color in F) sb.Append(colorToFace[color]);
        foreach (var color in D) sb.Append(colorToFace[color]);
        foreach (var color in L) sb.Append(colorToFace[color]);
        foreach (var color in B) sb.Append(colorToFace[color]);

        return sb.ToString();
    }

    public CubeState Clone()
    {
        return new CubeState
        {
            U = (string[])U.Clone(),
            D = (string[])D.Clone(),
            F = (string[])F.Clone(),
            B = (string[])B.Clone(),
            R = (string[])R.Clone(),
            L = (string[])L.Clone()
        };
    }

    public string ToKey()
    {
        return string.Concat(U) + string.Concat(D) + string.Concat(F) +
               string.Concat(B) + string.Concat(R) + string.Concat(L);
    }

    public bool IsSolved()
    {
        return U.All(c => c == "W") &&
               D.All(c => c == "Y") &&
               F.All(c => c == "G") &&
               B.All(c => c == "B") &&
               R.All(c => c == "R") &&
               L.All(c => c == "O");
    }

    public static CubeState GetSolvedState()
    {
        return new CubeState();
    }

    /// <summary>
    /// Validates the cube state and returns detailed information about any issues.
    /// Returns null if the cube is valid, otherwise returns a ValidationResult with details.
    /// </summary>
    public ValidationResult? ValidateState()
    {
        var result = new ValidationResult();

        // Valid edges (each defined by two colors that share an edge on a solved cube)
        // Colors are sorted alphabetically: B < G < O < R < W < Y
        var validEdges = new HashSet<string>
        {
            "GW", "RW", "BW", "OW",  // U edges (white with green, red, blue, orange) - sorted
            "GY", "RY", "BY", "OY",  // D edges (yellow with green, red, blue, orange) - sorted
            "GR", "GO", "BR", "BO"   // Middle edges (already sorted)
        };

        // Valid corners (each defined by three colors that share a corner on a solved cube)
        // Colors sorted alphabetically: B < G < O < R < W < Y
        var validCorners = new HashSet<string>
        {
            "GRW", "GOW", "BRW", "BOW",  // U corners (white with pairs) - sorted
            "GRY", "GOY", "BRY", "BOY"   // D corners (yellow with pairs) - sorted
        };

        // Edge positions: [face1, index1, face2, index2, position name]
        var edgePositions = new (string face1, int idx1, string face2, int idx2, string pos)[]
        {
            ("U", 7, "F", 1, "UF"), ("U", 5, "R", 1, "UR"), ("U", 1, "B", 1, "UB"), ("U", 3, "L", 1, "UL"),
            ("D", 1, "F", 7, "DF"), ("D", 5, "R", 7, "DR"), ("D", 7, "B", 7, "DB"), ("D", 3, "L", 7, "DL"),
            ("F", 5, "R", 3, "FR"), ("F", 3, "L", 5, "FL"), ("B", 3, "R", 5, "BR"), ("B", 5, "L", 3, "BL")
        };

        // Corner positions: [face1, idx1, face2, idx2, face3, idx3, position name]
        var cornerPositions = new (string face1, int idx1, string face2, int idx2, string face3, int idx3, string pos)[]
        {
            ("U", 8, "F", 2, "R", 0, "UFR"), ("U", 6, "F", 0, "L", 2, "UFL"),
            ("U", 2, "B", 0, "R", 2, "UBR"), ("U", 0, "B", 2, "L", 0, "UBL"),
            ("D", 2, "F", 8, "R", 6, "DFR"), ("D", 0, "F", 6, "L", 8, "DFL"),
            ("D", 8, "B", 6, "R", 8, "DBR"), ("D", 6, "B", 8, "L", 6, "DBL")
        };

        // Helper to get face array
        string[] GetFace(string face) => face switch
        {
            "U" => U, "D" => D, "F" => F, "B" => B, "R" => R, "L" => L,
            _ => throw new ArgumentException($"Invalid face: {face}")
        };

        // Count edges
        var edgeCounts = new Dictionary<string, List<string>>();
        foreach (var (face1, idx1, face2, idx2, pos) in edgePositions)
        {
            var c1 = GetFace(face1)[idx1];
            var c2 = GetFace(face2)[idx2];
            var sorted = string.Concat(new[] { c1, c2 }.OrderBy(c => c));

            if (!edgeCounts.ContainsKey(sorted))
                edgeCounts[sorted] = new List<string>();
            edgeCounts[sorted].Add(pos);

            // Check if this is a valid edge combination
            if (!validEdges.Contains(sorted))
            {
                result.InvalidEdges.Add($"{c1}-{c2} at {pos}");
            }
        }

        // Check for missing/duplicate edges
        foreach (var validEdge in validEdges)
        {
            if (!edgeCounts.TryGetValue(validEdge, out var positions) || positions.Count == 0)
            {
                result.MissingEdges.Add($"{validEdge[0]}-{validEdge[1]}");
            }
            else if (positions.Count > 1)
            {
                result.DuplicateEdges.Add($"{validEdge[0]}-{validEdge[1]} at {string.Join(", ", positions)}");
            }
        }

        // Count corners
        var cornerCounts = new Dictionary<string, List<string>>();
        foreach (var (face1, idx1, face2, idx2, face3, idx3, pos) in cornerPositions)
        {
            var c1 = GetFace(face1)[idx1];
            var c2 = GetFace(face2)[idx2];
            var c3 = GetFace(face3)[idx3];
            var sorted = string.Concat(new[] { c1, c2, c3 }.OrderBy(c => c));

            if (!cornerCounts.ContainsKey(sorted))
                cornerCounts[sorted] = new List<string>();
            cornerCounts[sorted].Add(pos);

            // Check if this is a valid corner combination
            if (!validCorners.Contains(sorted))
            {
                result.InvalidCorners.Add($"{c1}-{c2}-{c3} at {pos}");
            }
        }

        // Check for missing/duplicate corners
        foreach (var validCorner in validCorners)
        {
            if (!cornerCounts.TryGetValue(validCorner, out var positions) || positions.Count == 0)
            {
                result.MissingCorners.Add($"{validCorner[0]}-{validCorner[1]}-{validCorner[2]}");
            }
            else if (positions.Count > 1)
            {
                result.DuplicateCorners.Add($"{validCorner[0]}-{validCorner[1]}-{validCorner[2]} at {string.Join(", ", positions)}");
            }
        }

        return result.HasIssues ? result : null;
    }
}

public class ValidationResult
{
    public List<string> MissingEdges { get; } = new();
    public List<string> DuplicateEdges { get; } = new();
    public List<string> InvalidEdges { get; } = new();
    public List<string> MissingCorners { get; } = new();
    public List<string> DuplicateCorners { get; } = new();
    public List<string> InvalidCorners { get; } = new();

    public bool HasIssues => MissingEdges.Count > 0 || DuplicateEdges.Count > 0 ||
                             InvalidEdges.Count > 0 || MissingCorners.Count > 0 ||
                             DuplicateCorners.Count > 0 || InvalidCorners.Count > 0;

    public string GetDetailedMessage()
    {
        var parts = new List<string>();

        if (InvalidEdges.Count > 0)
            parts.Add($"Invalid edges: {string.Join("; ", InvalidEdges)}");
        if (MissingEdges.Count > 0)
            parts.Add($"Missing edges: {string.Join(", ", MissingEdges)}");
        if (DuplicateEdges.Count > 0)
            parts.Add($"Duplicate edges: {string.Join("; ", DuplicateEdges)}");
        if (InvalidCorners.Count > 0)
            parts.Add($"Invalid corners: {string.Join("; ", InvalidCorners)}");
        if (MissingCorners.Count > 0)
            parts.Add($"Missing corners: {string.Join(", ", MissingCorners)}");
        if (DuplicateCorners.Count > 0)
            parts.Add($"Duplicate corners: {string.Join("; ", DuplicateCorners)}");

        return string.Join(". ", parts);
    }
}

public class SolveRequest
{
    public CubeState State { get; set; } = new();
}

public class SolveResponse
{
    public List<string> Solution { get; set; } = new();
    public int MoveCount { get; set; }
    public long SolveTimeMs { get; set; }
    public string? Error { get; set; }
}
