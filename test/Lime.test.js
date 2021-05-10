const {expect} = require("chai");
const {BN,expectEvent} = require('@openzeppelin/test-helpers');

describe("Lime", function () {

    const TOTAL_SUPPLY = "1000000000000000000000000000";

    beforeEach(async function () {
        const Lime = await ethers.getContractFactory("LIME");
        const lime = await Lime.deploy();
        this.lime = await lime.deployed();

        const [owner, addr1] = await ethers.getSigners();
        this.owner = owner;
        this.addr1 = addr1;
    });

    describe("Details part", function () {

        it("Should return right name", async function () {
            expect(await this.lime.name()).to.equal("iMe Lab");
        });

        it("Should return right symbol", async function () {
            expect(await this.lime.symbol()).to.equal("LIME");
        });

        it("Should return right decimals", async function () {
            expect(await this.lime.decimals()).to.equal(18);
        });

        it("Should return right totalSupply", async function () {
            expect(await this.lime.totalSupply()).to.equal(TOTAL_SUPPLY);
        });
    });

    describe("Ownable part (mint, burnByOwner, pause, unpause)", function () {

        it("Mint is called only by the owner", async function () {
            await expect(this.lime.connect(this.addr1).mint(this.addr1.address, "100"))
                .to.be.revertedWith('Ownable: caller is not the owner');
            await this.lime.burn("100");
            const newSupply = ((new BN(TOTAL_SUPPLY)).sub(new BN("100"))).toString();
            expect(await this.lime.totalSupply()).to.equal(newSupply);
            await this.lime.mint(this.owner.address, "100");
            expect(await this.lime.totalSupply()).to.equal(TOTAL_SUPPLY);
        });

        it("Method burnByOwner is called only by the owner", async function () {
            await expect(this.lime.connect(this.addr1).burnByOwner(this.addr1.address, "100"))
                .to.be.revertedWith('Ownable: caller is not the owner');
        });

        it("Method pause is called only by the owner", async function () {
            await expect(this.lime.connect(this.addr1).pause())
                .to.be.revertedWith('Ownable: caller is not the owner');
        });

        it("Method unpause is called only by the owner", async function () {
            await expect(this.lime.connect(this.addr1).unpause())
                .to.be.revertedWith('Ownable: caller is not the owner');
        });
    });

    describe("Cap part", function () {

        it("Should return cap", async function () {
            expect(await this.lime.cap()).to.equal(TOTAL_SUPPLY);
        });

        it("Cap works", async function () {
            await expect(this.lime.mint(this.owner.address, "100"))
                .to.be.revertedWith('ERC20Capped: cap exceeded');
        });
    });

    describe("Pause part", function () {

        it("Works on unpause (transfer, burn, burnByOwner, mint)", async function () {
            // transfer
            await this.lime.transfer(this.addr1.address, "1000");
            expect(await this.lime.balanceOf(this.addr1.address)).to.equal("1000");
            // burn
            await this.lime.burnByOwner(this.addr1.address, "100");
            expect(await this.lime.balanceOf(this.addr1.address)).to.equal("900");
            await this.lime.connect(this.addr1).burn("100");
            expect(await this.lime.balanceOf(this.addr1.address)).to.equal("800");
            // mint
            await this.lime.mint(this.addr1.address, "50");
            expect(await this.lime.balanceOf(this.addr1.address)).to.equal("850");
        });

        it("Doesn\'t work on pause", async function () {
            await this.lime.burn("1000")
            await this.lime.pause();
            // transfer
            await expect(this.lime.transfer(this.addr1.address, "1000"))
                .to.be.revertedWith('ERC20Pausable: token transfer while paused');
            // burn
            await expect(this.lime.burnByOwner(this.addr1.address, "100"))
                .to.be.revertedWith('ERC20Pausable: token transfer while paused');
            // mint
            await expect(this.lime.mint(this.addr1.address, "50"))
                .to.be.revertedWith('ERC20Pausable: token transfer while paused');
        });
    });

    describe("Snapshot part", function () {

        it("Snapshot works", async function () {
            await this.lime.transfer(this.addr1.address, "1000");
            await this.lime.snapshot();
            expect((await this.lime.balanceOfAt(this.addr1.address, 1)).toString()).to.equal("1000");
            expect((await this.lime.balanceOfAt(this.owner.address, 1)).toString()).to.equal("999999999999999999999999000");
            await this.lime.burnByOwner(this.addr1.address, "100");
            await this.lime.snapshot();
            expect((await this.lime.balanceOfAt(this.addr1.address, 2)).toString()).to.equal("900");
        });
    });

});
