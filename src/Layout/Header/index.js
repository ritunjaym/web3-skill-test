// src/Layout/Header/index.js
import React from "react";
import {
  Avatar,
  AppBar,
  Box,
  Button,
  Toolbar,
  Tooltip,
  Typography,
  Stack,
  useMediaQuery,
} from "@mui/material";
import { Link } from "react-router-dom";
import Web3 from "web3";
import { useTheme } from "@mui/material/styles";
import { useDispatch } from "react-redux";
import MenuIcon from "@mui/icons-material/Menu";
import { setToLS } from "../../Utils/storage";
import {
  RPC,
  vrtABI,
  vrtAddress,
  daoABI,
  daoAddress,
} from "../../Constants/config";

const web3 = new Web3(new Web3.providers.HttpProvider(RPC));
const vrtContract = new web3.eth.Contract(vrtABI, vrtAddress);
const daoContract = new web3.eth.Contract(daoABI, daoAddress);

class Header extends React.Component {
  constructor(props) {
    super();
    this.state = {
      account: "",
      position: "",
    };
  }

  setDark = () => {
    this.props.dispatch({ type: "SET_THEME", payload: "dark" });
    setToLS("vegan-theme", "dark");
  };

  setLight = () => {
    this.props.dispatch({ type: "SET_THEME", payload: "light" });
    setToLS("vegan-theme", "light");
  };

  // Disconnect wallet function
  async disconnectWallet() {
    try {
      // Clear state immediately
      this.setState({
        account: "",
        position: "",
      });
      this.props.dispatch({ type: "SET_ACCOUNT", payload: "" });
      this.props.dispatch({ type: "SET_POSITION", payload: "" });

      // Try to disconnect from MetaMask (newer method)
      if (window.ethereum && window.ethereum.request) {
        try {
          await window.ethereum.request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }]
          });
        } catch (revokeError) {
          // If revoke fails, still consider it disconnected locally
          console.log("Wallet revoke permissions not supported, disconnected locally");
        }
      }
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  }

  async walletConnect() {
    // Check if MetaMask is installed
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install MetaMask to connect your wallet.");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: web3.utils.toHex(1666600000) }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: web3.utils.toHex(1666600000),
                chainName: "Harmony Mainnet",
                rpcUrls: ["https://api.harmony.one"],
                nativeCurrency: {
                  name: "ONE",
                  symbol: "ONE", // 2-6 characters long
                  decimals: 18,
                },
                blockExplorerUrls: "https://explorer.harmony.one/",
              },
            ],
          });
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: web3.utils.toHex(1666600000) }],
          });
        } catch (addError) {
          console.error("Failed to add Harmony network:", addError);
          alert("Failed to add Harmony network to MetaMask.");
          return;
        }
      } else {
        console.error("Failed to switch network:", switchError);
        alert("Failed to switch to Harmony network.");
        return;
      }
    }

    try {
      if (window.ethereum) {
        window.web3 = new Web3(window.ethereum);
        await window.ethereum.enable();
        const clientWeb3 = window.web3;
        const accounts = await clientWeb3.eth.getAccounts();
        
        if (accounts.length === 0) {
          alert("No accounts found. Please connect your wallet.");
          return;
        }
        
        this.setState({
          account: accounts[0],
        });
        this.props.dispatch({ type: "SET_ACCOUNT", payload: accounts[0] });
        await this.getPosition(accounts[0]);
      } else if (window.web3) {
        window.web3 = new Web3(window.web3.currentProvider);
        const clientWeb3 = window.web3;
        const accounts = await clientWeb3.eth.getAccounts();
        this.setState({
          account: accounts[0],
        });
        this.props.dispatch({ type: "SET_ACCOUNT", payload: accounts[0] });
        await this.getPosition(accounts[0]);
      }

      const { ethereum } = window;
      ethereum.on("accountsChanged", async (accounts) => {
        try {
          if (accounts.length === 0) {
            // User disconnected wallet
            this.setState({
              account: "",
              position: "",
            });
            this.props.dispatch({ type: "SET_ACCOUNT", payload: "" });
            this.props.dispatch({ type: "SET_POSITION", payload: "" });
            return;
          }
          
          const newAccount = web3.utils.toChecksumAddress(accounts[0]);
          this.setState({ account: newAccount });
          this.props.dispatch({ type: "SET_ACCOUNT", payload: newAccount });
          await this.getPosition(newAccount);
        } catch (err) {
          console.error("Error processing account change:", err);
        }
      });

      ethereum.on("chainChanged", async (chainId) => {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: web3.utils.toHex(1666600000) }],
        });
      });
    } catch (error) {
      console.error("Wallet connection error:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  }

  async getPosition(address) {
    const balance = await vrtContract.methods.balanceOf(address).call();
    const owner = await daoContract.methods.owner().call();
    const admin = await daoContract.methods.admin().call();

    if (address === owner) {
      this.setState({
        position: "OWNER",
      });
      this.props.dispatch({ type: "SET_POSITION", payload: "OWNER" });
    } else if (address === admin) {
      this.setState({
        position: "ADMIN",
      });
      this.props.dispatch({ type: "SET_POSITION", payload: "ADMIN" });
    } else {
      if (balance > 0) {
        this.setState({
          position: "MEMBER",
        });
        this.props.dispatch({ type: "SET_POSITION", payload: "MEMBER" });
      } else {
        this.setState({
          position: "GUEST",
        });
        this.props.dispatch({ type: "SET_POSITION", payload: "GUEST" });
      }
    }
  }

  render() {
    return (
      <AppBar
        position="fixed"
        sx={{
          zIndex: 1300,
          boxShadow: "none",
          bgcolor: this.props.theme.palette.background.default,
          backgroundImage: "unset",
          borderBottom: `1px solid ${this.props.theme.palette.divider}`,
          py: 2,
        }}
      >
        <Toolbar
          sx={{
            gap: this.props.matchUpMd ? 6 : 2,
            justifyContent: "space-between",
          }}
        >
          <Stack
            alignItems="center"
            flexDirection="row"
            gap={this.props.matchUpMd ? 6 : 2}
          >
            <Button
              size="small"
              edge="start"
              variant="outlined"
              // color="inherit"
              aria-label="menu"
              onClick={() => this.props.handleDrawerOpen()}
              sx={{
                px: 1,
                minWidth: "unset",
                display: { sm: "block", md: "none" },
              }}
            >
              <MenuIcon />
            </Button>
            <Link to="/">
              <Box
                sx={{ display: { xs: "none", sm: "block" } }}
                component="img"
                src={
                  this.props.theme.palette.mode === "dark"
                    ? "/images/logo_main_white.png"
                    : "/images/logo_main.png"
                }
              />
            </Link>
            <Typography
              variant="h2"
              sx={{
                flexGrow: 1,
                color: this.props.theme.palette.text.primary,
                display: { xs: "none", md: "block" },
              }}
            >
              Vegan Rob's DAO
            </Typography>
          </Stack>
          <Stack flexDirection="row" gap={5} alignItems="center">
            {/* Connect/Disconnect Button */}
            {!this.state.account ? (
              <Button
                variant="contained"
                color="success"
                sx={{
                  fontWeight: 700,
                  display: { xs: "none", sm: "block" },
                  color: this.props.theme.palette.common.white,
                }}
                onClick={() => this.walletConnect()}
              >
                Connect Wallet
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="error"
                sx={{
                  fontWeight: 700,
                  display: { xs: "none", sm: "block" },
                }}
                onClick={() => this.disconnectWallet()}
              >
                Disconnect
              </Button>
            )}
            
            <Stack flexDirection="row" alignItems="center" gap={4}>
              <Stack
                flexDirection="row"
                alignItems="center"
                gap={1}
                sx={{
                  display: { xs: "none", sm: "flex" },
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: this.props.theme.palette.text.primary,
                  }}
                />
                <Stack>
                  {this.state.account ? (
                    <Tooltip title={this.state.account}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: this.props.theme.palette.text.primary,
                        }}
                      >
                        {this.state.account
                          ? this.state.account.slice(0, 8) + "..."
                          : ""}
                      </Typography>
                    </Tooltip>
                  ) : (
                    <></>
                  )}
                  <Typography
                    variant="overline"
                    sx={{
                      textTransform: "capitalize",
                      color: this.props.theme.palette.text.secondary,
                    }}
                  >
                    {this.state.position}
                  </Typography>
                </Stack>
              </Stack>
              {this.props.theme.palette.mode === "dark" ? (
                <Box
                  component="img"
                  src="/images/sun.png"
                  sx={{ cursor: "pointer" }}
                  onClick={this.setLight}
                />
              ) : (
                <Box
                  component="img"
                  src="/images/moon.png"
                  sx={{ cursor: "pointer" }}
                  onClick={this.setDark}
                />
              )}
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>
      // </Box>
    );
  }
}

const withHook = (Header) => {
  return (props) => {
    const theme = useTheme();
    const dispatch = useDispatch();
    const matchUpMd = useMediaQuery(theme.breakpoints.up("md"));
    return (
      <Header
        theme={theme}
        dispatch={dispatch}
        {...props}
        matchUpMd={matchUpMd}
      />
    );
  };
};

export default withHook(Header);