
const { getWeth, AMOUNT } = require("../scripts/getWeth.js")
const { getNamedAccounts, ethers } = require('hardhat');

async function main() {


    await getWeth();
        // => Got 20000000000000000 WETH
            // => = 0.020000000000000000 WETH
    console.log('-----------------------------');

        
    const { deployer } = await getNamedAccounts();
    const signer = await ethers.getSigner(deployer);

    const lendingPool = await getLendingPool(signer);
    console.log(`lendingPool address: ${lendingPool.target}`);
    
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    await approveErc20(wethTokenAddress, lendingPool.target, AMOUNT, signer);
    console.log("Depositing...");
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
        
    console.log("Deposited!");
    console.log('-----------------------------');
    
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer);
        // => ...You can borrow 16500000000000000 worth of ETH...
            // => = 0.016500000000000000 ETH
                // (= 16500000000000000 Wei) 
            
    const daiPrice = await getDaiPrice();
        // => ... The DAI/ETH price is 275708537258606
            // => = The DAI/ETH price is 0.000275708537258606
    
    const amountDaiToBorrow2 = Number(availableBorrowsETH) * 0.95 * (1 / Number(daiPrice));
    console.log(`You can borrow ${amountDaiToBorrow2.toString()} DAI`);
    const amountDaiToBorrow3 = availableBorrowsETH.toString() * 0.95 * (1 / Number(daiPrice));
        
    console.log(`You can borrow ${amountDaiToBorrow3.toString()} DAI`);
        // => ...You can borrow 55.094531304429935 DAI
            // => = You can borrow 55.094531304429935 DAI
    
    const amountDaiToBorrowWeiStuff = ethers.parseEther(amountDaiToBorrow2.toString());

    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    await borrowDai(
        daiTokenAddress,
        lendingPool,
        amountDaiToBorrowWeiStuff,
        deployer
    );
    await getBorrowUserData(lendingPool, deployer);

    console.log('-----------------------------');
    
    // repay
    await repay(
        amountDaiToBorrowWeiStuff,
        daiTokenAddress,
        lendingPool,
        signer
    );
    await getBorrowUserData(lendingPool, deployer);

    console.log('-----------------------------');
}

async function getLendingPool(signer) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        signer
    );
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();

    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, signer);
    return lendingPool
}

async function approveErc20(erc20Address, spenderAddress, amount, signer) {

    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, signer);
        
    const tx = await erc20Token.approve(spenderAddress, amount);
    await tx.wait(1);
    console.log("Approved!");
}

async function getBorrowUserData(lendingPool, account) {
    const {
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH
    } = await lendingPool.getUserAccountData(account);
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`);
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`);
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`);
       
    return { availableBorrowsETH, totalDebtETH };
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4",   
    );
    const price = (await daiEthPriceFeed.latestRoundData()).answer;
    console.log(`The DAI/ETH price is ${price.toString()}`);
    return price;
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
    const borrowTx = await lendingPool.borrow(
        daiAddress, 
        amountDaiToBorrow, 
        2, 
        0,
        account
    );
    await borrowTx.wait(1);
    console.log("Borrowed!");
}

async function repay(amount, daiAddress, lendingPool, signer) {
    await approveErc20(daiAddress, lendingPool.target, amount, signer);
    const repayTx = await lendingPool.repay(
        daiAddress,
        amount,
        2, 
        signer
    );
        
    await repayTx.wait(1);
    console.log("Repaid!");
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
