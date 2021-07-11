import { expect } from 'chai';
import { shallow } from "enzyme";
import HomePage from '././components/HomePage';

describe('join with url', () => {
    it("insert value in components state(url) with events value", () => {
      const home = shallow(<HomePage />);
      const form = home.find('input');
      // when
      form.props().onChange({target: {
        name: 'myName',
        value: 'myValue'
      }});
      // then
      expect(component.state('url')).toEqual('myValue');
    });
});