import { expect } from 'chai';
import { shallow } from "enzyme";
import Meet from '././components/Meet';

describe('Meet page rendering', () => {
      it('should create object', () => {
        expect(Meet.prototype).to.not.be.null;
      });
});

describe('connect with username', () => {
  it("insert value in components state(username) with events value", () => {
    const Meet = shallow(<Meet />);
    const form = Meet.find('input');
    // when
    form.props().onChange({target: {
      name: 'myName',
      value: 'myValue'
    }});
    // then
    expect(component.state('username')).toEqual('myValue');
  });
});