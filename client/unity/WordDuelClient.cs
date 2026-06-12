using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using SocketIOClient;           // SocketIOUnity package by itisnajim
using Newtonsoft.Json.Linq;

/// <summary>
/// Word Duel — Unity client.
///
/// Dependencies (install via Unity Package Manager or OpenUPM):
///   • SocketIOUnity  ≥ 4.x   https://github.com/itisnajim/SocketIOUnity
///   • Newtonsoft.Json for Unity
///   • TextMeshPro (built-in UPM package)
///
/// Scene setup:
///   1. Create a Canvas with four child panels: ConnectPanel, QueuePanel,
///      GamePanel, ResultPanel.
///   2. Inside GamePanel add a 4×4 grid of Button GameObjects, each with a
///      GridTile component. Assign them to gridTiles[0..15] (row-major order).
///   3. Wire every [SerializeField] reference in the Inspector.
///   4. Attach this script to a persistent GameObject in the scene.
/// </summary>
public class WordDuelClient : MonoBehaviour
{
    // ── Inspector wiring ──────────────────────────────────────────────────────

    [Header("Server")]
    [SerializeField] private string serverUrl          = "http://localhost:3001";
    [SerializeField] private int    reconnectAttempts  = 5;
    [SerializeField] private int    reconnectDelayMs   = 2000;

    [Header("Panels")]
    [SerializeField] private GameObject connectPanel;
    [SerializeField] private GameObject queuePanel;
    [SerializeField] private GameObject gamePanel;
    [SerializeField] private GameObject resultPanel;

    [Header("Connect Panel")]
    [SerializeField] private Button             connectButton;
    [SerializeField] private TextMeshProUGUI    connectStatusText;

    [Header("Queue Panel")]
    [SerializeField] private TextMeshProUGUI    queueStatusText;
    [SerializeField] private Button             cancelQueueButton;

    [Header("Game Panel — HUD")]
    [SerializeField] private TextMeshProUGUI    timerText;
    [SerializeField] private TextMeshProUGUI    myScoreText;
    [SerializeField] private TextMeshProUGUI    oppScoreText;
    [SerializeField] private TextMeshProUGUI    currentWordText;
    [SerializeField] private TextMeshProUGUI    feedbackText;
    [SerializeField] private Button             submitButton;
    [SerializeField] private Button             clearButton;

    [Header("Game Panel — Grid (row-major, 0..15)")]
    [SerializeField] private GridTile[]         gridTiles;   // assign 16 tiles

    [Header("Result Panel")]
    [SerializeField] private TextMeshProUGUI    resultTitleText;
    [SerializeField] private TextMeshProUGUI    resultDetailsText;
    [SerializeField] private Button             playAgainButton;

    // ── Private state ─────────────────────────────────────────────────────────

    private SocketIOUnity    _socket;
    private string           _mySocketId;

    // Grid is stored row-major; access via _grid[r][c] or _grid[i/4][i%4].
    private readonly string[][] _grid = new string[4][];

    private long    _endTs;          // server Unix-ms timestamp when round ends
    private int     _myScore;
    private int     _oppScore;

    private readonly List<int> _selected = new();   // flat indices of selected tiles

    private bool    _matchActive;
    private bool    _connecting;

    // Socket.IO callbacks arrive on a background thread; queue actions for the
    // Unity main thread.
    private readonly Queue<Action> _mainQueue = new();

    // ── Unity lifecycle ───────────────────────────────────────────────────────

    void Awake()
    {
        for (int r = 0; r < 4; r++) _grid[r] = new string[4];
    }

    void Start()
    {
        // Wire up UI buttons
        connectButton.onClick.AddListener(OnConnectClicked);
        cancelQueueButton.onClick.AddListener(OnCancelQueueClicked);
        submitButton.onClick.AddListener(OnSubmitClicked);
        clearButton.onClick.AddListener(ClearSelection);
        playAgainButton.onClick.AddListener(OnPlayAgainClicked);

        // Wire up each tile
        for (int i = 0; i < gridTiles.Length; i++)
        {
            int captured = i;
            gridTiles[i].OnTileClicked += () => HandleTileClick(captured);
        }

        // Initial UI state
        submitButton.interactable = false;
        feedbackText.text         = string.Empty;
        currentWordText.text      = string.Empty;
        ShowPanel(connectPanel);
    }

    void Update()
    {
        // Flush main-thread actions dispatched from socket callbacks.
        lock (_mainQueue)
            while (_mainQueue.Count > 0)
                _mainQueue.Dequeue()?.Invoke();

        // Live countdown driven by server end-timestamp.
        if (_matchActive && _endTs > 0)
        {
            float remaining = Mathf.Max(
                0f,
                (_endTs - DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()) / 1000f);

            timerText.text  = $"{remaining:F1}s";
            timerText.color = remaining <= 10f ? Color.red : Color.white;
        }
    }

    void OnDestroy() => _socket?.DisconnectAsync();

    // ── Connection ────────────────────────────────────────────────────────────

    async void OnConnectClicked()
    {
        if (_connecting) return;
        _connecting = true;
        connectButton.interactable = false;
        connectStatusText.text     = "Connecting…";

        _socket = new SocketIOUnity(serverUrl, new SocketIOOptions
        {
            Reconnection        = true,
            ReconnectionAttempts = reconnectAttempts,
            ReconnectionDelay   = reconnectDelayMs,
            Transport           = SocketIOClient.Transport.TransportProtocol.WebSocket,
        });

        RegisterSocketEvents();

        try
        {
            await _socket.ConnectAsync();

            // SocketIOUnity raises OnConnected on a background thread.
            // The state after ConnectAsync completes is Connected.
            Dispatch(() =>
            {
                _mySocketId            = _socket.Id;
                connectStatusText.text = "Connected";
                ShowPanel(queuePanel);
                queueStatusText.text   = "Searching for opponent…";
                _socket.EmitAsync("join_queue");
            });
        }
        catch (Exception ex)
        {
            Dispatch(() =>
            {
                connectStatusText.text     = $"Connection failed:\n{ex.Message}";
                connectButton.interactable = true;
                _connecting = false;
            });
        }
    }

    void RegisterSocketEvents()
    {
        // OnUnityThread variants dispatch directly to the Unity main thread
        // (SocketIOUnity feature); no manual Dispatch() needed inside them.
        _socket.OnConnected += (_, _) =>
            Dispatch(() => connectStatusText.text = "Connected");

        _socket.OnDisconnected += (_, reason) =>
            Dispatch(() =>
            {
                if (!_matchActive) return;
                SetFeedback($"Disconnected ({reason}) — reconnecting…", Color.yellow);
            });

        _socket.OnReconnected += (_, attempt) =>
            Dispatch(() => SetFeedback($"Reconnected (attempt {attempt})", Color.cyan));

        _socket.OnReconnectFailed += (_, _) =>
            Dispatch(() =>
            {
                _matchActive  = false;
                _connecting   = false;
                connectButton.interactable = true;
                connectStatusText.text     = "Could not reconnect. Try again.";
                ShowPanel(connectPanel);
            });

        _socket.On("error", resp =>
            Dispatch(() =>
            {
                var msg = resp.GetValue<JObject>()?["message"]?.ToString() ?? "Unknown error";
                SetFeedback($"Error: {msg}", Color.red);
            }));

        _socket.On("queued", resp =>
            Dispatch(() =>
            {
                int pos = resp.GetValue<JObject>()?["position"]?.Value<int>() ?? 1;
                queueStatusText.text = $"In queue — position {pos}…";
            }));

        _socket.On("match_start", resp =>
            Dispatch(() => HandleMatchStart(resp.GetValue<JObject>())));

        _socket.On("word_result", resp =>
            Dispatch(() => HandleWordResult(resp.GetValue<JObject>())));

        _socket.On("match_end", resp =>
            Dispatch(() => HandleMatchEnd(resp.GetValue<JObject>())));
    }

    // ── Match events ──────────────────────────────────────────────────────────

    void HandleMatchStart(JObject data)
    {
        // Parse the 4×4 grid sent by the server.
        var gridArray = (JArray)data["grid"];
        for (int r = 0; r < 4; r++)
            for (int c = 0; c < 4; c++)
                _grid[r][c] = gridArray[r][c].ToString().ToUpper();

        _endTs       = data["endTs"].Value<long>();
        _myScore     = 0;
        _oppScore    = 0;
        _matchActive = true;

        RenderGrid();
        ClearSelection();

        myScoreText.text  = "You: 0";
        oppScoreText.text = "Opp: —";
        feedbackText.text = string.Empty;

        ShowPanel(gamePanel);
    }

    void HandleWordResult(JObject data)
    {
        bool   valid        = data["valid"].Value<bool>();
        string word         = data["word"].ToString();
        string reason       = data["reason"].ToString();
        int    score        = data["score"].Value<int>();
        _myScore            = data["runningScore"].Value<int>();

        myScoreText.text = $"You: {_myScore}";

        if (valid)
            SetFeedback($"{word}  +{score} pts", Color.green);
        else
            SetFeedback(ReasonToMessage(reason, word), Color.red);

        ClearSelection();
        StartCoroutine(ClearFeedbackAfter(1.8f));
    }

    void HandleMatchEnd(JObject data)
    {
        _matchActive = false;

        string     winnerId = data["winner"]?.ToString();           // null on draw
        var        scores   = (JObject)data["scores"];
        var        payouts  = (JObject)data["payouts"];
        double     rake     = data["rake"]?.Value<double>() ?? 0;

        // Identify our score row by matching socket id.
        int myTotal  = scores[_mySocketId]?.Value<int>() ?? _myScore;
        int oppTotal = 0;
        foreach (var kv in scores)
            if (kv.Key != _mySocketId) oppTotal = kv.Value.Value<int>();

        bool isDraw = string.IsNullOrEmpty(winnerId);
        bool iWon   = !isDraw && winnerId == _mySocketId;

        double myPayout = payouts[_mySocketId]?.Value<double>() ?? 0;

        resultTitleText.text  = isDraw ? "DRAW" : iWon ? "VICTORY!" : "DEFEAT";
        resultTitleText.color = isDraw ? Color.yellow : iWon ? Color.green : Color.red;

        resultDetailsText.text =
            $"Your score:  {myTotal}\n"  +
            $"Opp score:   {oppTotal}\n\n" +
            (isDraw
                ? $"Refund:  ${myPayout:F2}  (no rake on draws)"
                : iWon
                    ? $"Prize:   ${myPayout:F2}  (rake ${rake:F2})"
                    : $"Payout:  $0.00");

        ShowPanel(resultPanel);
    }

    // ── Grid rendering & tile interaction ─────────────────────────────────────

    void RenderGrid()
    {
        for (int r = 0; r < 4; r++)
            for (int c = 0; c < 4; c++)
                gridTiles[r * 4 + c].SetLetter(_grid[r][c]);
    }

    void HandleTileClick(int idx)
    {
        if (!_matchActive) return;

        // If the tile is already in the selection chain, deselect it and
        // everything after it (allows partial backtracking).
        int existingPos = _selected.IndexOf(idx);
        if (existingPos >= 0)
        {
            for (int i = _selected.Count - 1; i >= existingPos; i--)
                gridTiles[_selected[i]].SetState(TileState.Normal);
            _selected.RemoveRange(existingPos, _selected.Count - existingPos);
        }
        else
        {
            // Require adjacency to the last selected tile.
            if (_selected.Count > 0 && !AreAdjacent(_selected[^1], idx))
                return;

            _selected.Add(idx);
            gridTiles[idx].SetState(TileState.Selected);
        }

        RefreshWordDisplay();
    }

    /// <summary>Two tiles are adjacent if they share an edge or corner.</summary>
    static bool AreAdjacent(int a, int b)
    {
        int ar = a / 4, ac = a % 4;
        int br = b / 4, bc = b % 4;
        return Math.Abs(ar - br) <= 1 && Math.Abs(ac - bc) <= 1 && a != b;
    }

    void ClearSelection()
    {
        foreach (int i in _selected) gridTiles[i].SetState(TileState.Normal);
        _selected.Clear();
        RefreshWordDisplay();
    }

    void RefreshWordDisplay()
    {
        if (_selected.Count == 0)
        {
            currentWordText.text      = string.Empty;
            submitButton.interactable = false;
            return;
        }

        string word = BuildWordFromSelection();
        currentWordText.text      = word;
        submitButton.interactable = word.Length >= 3;
    }

    string BuildWordFromSelection() =>
        string.Concat(_selected.ConvertAll(i => _grid[i / 4][i % 4]));

    // ── Word submission ───────────────────────────────────────────────────────

    async void OnSubmitClicked()
    {
        if (!_matchActive || _selected.Count < 3) return;

        string word = BuildWordFromSelection();
        ClearSelection();   // clear immediately for fast re-input

        await _socket.EmitAsync("submit_word", new { word });
    }

    // ── Navigation / queue actions ────────────────────────────────────────────

    async void OnCancelQueueClicked()
    {
        if (_socket != null) await _socket.DisconnectAsync();
        _connecting = false;
        connectButton.interactable = true;
        connectStatusText.text     = "Disconnected";
        ShowPanel(connectPanel);
    }

    async void OnPlayAgainClicked()
    {
        _myScore  = 0;
        _oppScore = 0;
        ShowPanel(queuePanel);
        queueStatusText.text = "Searching for opponent…";
        await _socket.EmitAsync("join_queue");
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    void ShowPanel(GameObject target)
    {
        connectPanel.SetActive(target == connectPanel);
        queuePanel.SetActive(target == queuePanel);
        gamePanel.SetActive(target == gamePanel);
        resultPanel.SetActive(target == resultPanel);
    }

    void SetFeedback(string message, Color color)
    {
        feedbackText.text  = message;
        feedbackText.color = color;
    }

    IEnumerator ClearFeedbackAfter(float delay)
    {
        yield return new WaitForSeconds(delay);
        feedbackText.text  = string.Empty;
        feedbackText.color = Color.white;
    }

    static string ReasonToMessage(string reason, string word) => reason switch
    {
        "NOT_IN_DICTIONARY" => $"\"{word}\" is not a valid word",
        "NOT_ON_GRID"       => $"\"{word}\" cannot be traced on this board",
        "ALREADY_SCORED"    => $"\"{word}\" already found",
        "RATE_LIMITED"      => "Rate limit reached (20 words max)",
        "TOO_SHORT"         => "Words must be 3+ letters",
        _                   => $"\"{word}\" is invalid",
    };

    // ── Main-thread dispatcher ────────────────────────────────────────────────
    // Socket.IO callbacks fire on a background thread. This queue lets them
    // safely mutate Unity objects via Update().

    void Dispatch(Action action)
    {
        lock (_mainQueue) _mainQueue.Enqueue(action);
    }
}
