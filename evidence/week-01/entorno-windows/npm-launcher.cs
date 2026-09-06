using System;
using System.Diagnostics;
using System.Text;

class NpmLauncher
{
    static string Quote(string value)
    {
        StringBuilder result = new StringBuilder("\"");
        int slashes = 0;
        foreach (char ch in value)
        {
            if (ch == '\\') { slashes++; continue; }
            if (ch == '"') { result.Append('\\', slashes * 2 + 1); result.Append(ch); }
            else { result.Append('\\', slashes); result.Append(ch); }
            slashes = 0;
        }
        result.Append('\\', slashes * 2);
        result.Append('"');
        return result.ToString();
    }

    static int Main(string[] args)
    {
        Console.OutputEncoding = new UTF8Encoding(false);
        string node = Environment.GetEnvironmentVariable("CAMPUS_NODE_EXE");
        string cli = Environment.GetEnvironmentVariable("CAMPUS_NPM_CLI");
        if (String.IsNullOrEmpty(node) || String.IsNullOrEmpty(cli))
        {
            Console.Error.WriteLine("CAMPUS_NODE_EXE and CAMPUS_NPM_CLI are required.");
            return 127;
        }
        StringBuilder command = new StringBuilder(Quote(cli));
        foreach (string arg in args) { command.Append(' '); command.Append(Quote(arg)); }
        ProcessStartInfo info = new ProcessStartInfo(node, command.ToString());
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        info.RedirectStandardOutput = true;
        info.RedirectStandardError = true;
        info.StandardOutputEncoding = Encoding.UTF8;
        info.StandardErrorEncoding = Encoding.UTF8;
        using (Process process = new Process())
        {
            process.StartInfo = info;
            process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (e.Data != null) Console.Out.WriteLine(e.Data); };
            process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (e.Data != null) Console.Error.WriteLine(e.Data); };
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            process.WaitForExit();
            return process.ExitCode;
        }
    }
}
