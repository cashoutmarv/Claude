using System;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// A single letter tile in the 4×4 Word Duel grid.
/// Attach to a UI Button GameObject. Wire letterText and background
/// in the Inspector, then assign all 16 tiles to WordDuelClient.gridTiles[].
/// </summary>
public enum TileState { Normal, Selected, Disabled }

[RequireComponent(typeof(Button))]
public class GridTile : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI letterText;
    [SerializeField] private Image           background;

    [Header("Tile colors")]
    [SerializeField] private Color normalColor   = new Color(0.18f, 0.20f, 0.28f);
    [SerializeField] private Color selectedColor = new Color(0.95f, 0.62f, 0.08f);
    [SerializeField] private Color disabledColor = new Color(0.12f, 0.12f, 0.12f);

    // WordDuelClient subscribes to this to know which tile was tapped.
    public event Action OnTileClicked;

    private Button    _button;
    private TileState _state = TileState.Normal;

    void Awake()
    {
        _button = GetComponent<Button>();
        _button.onClick.AddListener(() => OnTileClicked?.Invoke());
    }

    /// <summary>Set the displayed letter and reset to Normal state.</summary>
    public void SetLetter(string letter)
    {
        letterText.text = letter.ToUpper();
        SetState(TileState.Normal);
    }

    public void SetState(TileState state)
    {
        _state = state;
        background.color    = StateToColor(state);
        _button.interactable = state != TileState.Disabled;
    }

    public TileState State => _state;

    private Color StateToColor(TileState s) => s switch
    {
        TileState.Selected => selectedColor,
        TileState.Disabled => disabledColor,
        _                  => normalColor,
    };
}
