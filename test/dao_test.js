const { assert } = require('chai');
const { utils } = require('@aeternity/aeproject');

const INVESTMENT_DAO_SOURCE = './contracts/InvestmentDAO.aes';

describe'InvestmentDAO', () => {
  let aeSdk;
  let contract;

  before(async () => {
    aeSdk = await utils.getSdk();
    const fileSystem = utils.getFilesystem(INVESTMENT_DAO_SOURCE);
    const sourceCode = utils.getContractContent(INVESTMENT_DAO_SOURCE);
    contract = await aeSdk.initializeContract({ sourceCode, fileSystem });
    await contract.init();
    await utils.createSnapshot(aeSdk);
  });

  afterEach(async () => {
    await utils.rollbackSnapshot(aeSdk);
  });

  it('should allow a user to join the DAO', async () => {
    const join = await contract.joinDAO();
    assert.equal(join.decodedResult, true);

    const isMember = await contract.isMember();
    assert.equal(isMember.decodedResult, true);
  });

  it('should create a proposal and increment the proposal count', async () => {
    const createProposal = await contract.createProposal('Test Proposal', 7);
    assert.equal(createProposal.decodedEvents[0].name, 'NewProposalEvent');

    const proposalCount = await contract.state.proposalCount();
    assert.equal(proposalCount.decodedResult, 1);
  });

  it('should allow a member to vote on a proposal and update vote counts', async () => {
    await contract.joinDAO();

    const createProposal = await contract.createProposal('Test Proposal', 7);
    const proposalId = createProposal.decodedEvents[0].args[0];

    const vote = await contract.vote(proposalId, true, { amount: 1 });
    assert.equal(vote.decodedEvents[0].name, 'VoteEvent');

    const voteFor = await contract.checkPropsalVoteFor(proposalId);
    assert.equal(voteFor.decodedResult, 1);
  });

  it('should end a proposal and set its status based on the votes', async () => {
    await contract.joinDAO();

    const createProposal = await contract.createProposal('Test Proposal', 7);
    const proposalId = createProposal.decodedEvents[0].args[0];

    await contract.vote(proposalId, true, { amount: 1 });
    await contract.endProposal(proposalId);

    const proposalStatus = await contract.state.proposals(proposalId).status();
    assert.equal(proposalStatus.decodedResult, 1);
  });

  it('should allow a member to withdraw their reward for a proposal', async () => {
    await contract.joinDAO();

    const createProposal = await contract.createProposal('Test Proposal', 7);
    const proposalId = createProposal.decodedEvents[0].args[0];

    await contract.vote(proposalId, true, { amount: 1 });
    await contract.endProposal(proposalId);

    const withdraw = await contract.withDraw(proposalId);
    assert.equal(withdraw.decodedEvents[0].name, 'WithdrawEvent');
  });

  it('should calculate the correct reward for a member', async () => {
    await contract.joinDAO();

    const createProposal = await contract.createProposal('Test Proposal', 7);
    const proposalId = createProposal.decodedEvents[0].args[0];

    await contract.vote(proposalId, true, { amount: 10 });
    await contract.endProposal(proposalId);

    const checkReward = await contract.checkReward(proposalId);
    assert.equal(checkReward.decodedResult, 2)

    it('should return the correct proposal description', async () => {
      const createProposal = await contract.createProposal('Test Proposal', 7);
      const proposalId = createProposal.decodedEvents[0].args[0];
    
      const description = await contract.checkProposal(proposalId);
      assert.equal(description.decodedResult, 'Test Proposal');
    });
    
    it('should return the correct vote count for a proposal', async () => {
      await contract.joinDAO();
    
      const createProposal = await contract.createProposal('Test Proposal', 7);
      const proposalId = createProposal.decodedEvents[0].args[0];
    
      await contract.vote(proposalId, true, { amount: 1 });
      await contract.vote(proposalId, false, { amount: 1 });
    
      const voteFor = await contract.checkPropsalVoteFor(proposalId);
      assert.equal(voteFor.decodedResult, 1);
    
      const voteAgain = await contract.checkPropsalVoteAgain(proposalId);
      assert.equal(voteAgain.decodedResult, 1);
    });
  });
}